// Orchestrator state machine. Each stage is idempotent per (request_id, kind),
// writes a claude_runs row, transitions feature_requests.status, and emits an
// activity event + client notification. LLM stages respect the daily cost cap;
// the review stage classifies risk and applies the auto-merge policy.
import { one } from '../lib/db';
import { getBoss } from '../boss';
import { maybeLlm } from '../lib/llm';
import { activity, notify } from '../lib/notify';
import { classifyRisk, type Risk } from './risk';
import { isAutoMergeEligible } from './mergePolicy';
import {
  buildUserPrompt,
  composeBuildPrompt,
  MODEL_BY_STAGE,
  PURPOSE_BY_STAGE,
  quoteFallback,
  reviewMarkdown,
  STAGE_TITLE,
  SYSTEM_BY_STAGE,
  TEMPLATE_BY_STAGE,
  type ProjectRow,
  type RequestRow,
  type Stage,
} from './stages';

export type PrPayload = { pr_url?: string; files: string[]; additions?: number; ci?: 'green' | 'red' | 'unknown' };

export type StageResult = {
  reused?: boolean;
  cancelled?: boolean;
  error?: string;
  run?: { id: string; status: string };
  risk?: Risk;
  review?: 'pass' | 'needs_changes';
  eligible?: boolean;
  prompt?: string;
  nextStatus?: string;
};

const LLM_STAGES: Stage[] = ['scope', 'quote', 'plan', 'review', 'deploy'];

async function withinDailyCap(): Promise<boolean> {
  const row = await one<{ p: number }>('select coalesce(sum(cost_pence),0)::int as p from llm_calls where created_at >= current_date');
  const capPence = Number(process.env.LLM_DAILY_CAP_GBP ?? 50) * 100;
  return (row?.p ?? 0) < capPence;
}

async function getSettingBool(key: string, dflt: boolean): Promise<boolean> {
  const row = await one<{ value: unknown }>('select value from settings where key=$1', [key]);
  if (!row) return dflt;
  return row.value === true || row.value === 'true';
}

/** Hand a job to the builder worker. Best-effort: no-op when pg-boss isn't
 *  running (e.g. unit tests call runStage directly). */
async function enqueueBuilder(queue: string, data: Record<string, unknown>): Promise<void> {
  try {
    const boss = getBoss();
    await boss.createQueue(queue).catch(() => undefined);
    await boss.send(queue, data, {});
  } catch {
    /* builder not reachable from this context */
  }
}

type Dispatch = {
  runStatus?: string;
  resultMd?: string;
  prompt?: string;
  tokensIn?: number;
  tokensOut?: number;
  costGbp?: number;
  metadata?: Record<string, unknown>;
  nextStatus?: string;
  risk?: Risk;
  review?: 'pass' | 'needs_changes';
  eligible?: boolean;
};

async function llmOrTemplate(
  stage: Stage,
  request: RequestRow,
  project: ProjectRow,
  fallback: () => string,
): Promise<{ resultMd: string; prompt: string; tokensIn?: number; tokensOut?: number; costGbp?: number }> {
  const prompt = buildUserPrompt(stage, request, project);
  const res = await maybeLlm({ purpose: PURPOSE_BY_STAGE[stage], model: MODEL_BY_STAGE[stage], system: SYSTEM_BY_STAGE[stage], user: prompt, max_tokens: 4096, ref: { kind: 'request', id: request.id } });
  if (res) return { resultMd: res.text, prompt, tokensIn: res.tokens_in, tokensOut: res.tokens_out, costGbp: res.cost_gbp };
  return { resultMd: fallback(), prompt };
}

async function dispatch(kind: Stage, request: RequestRow, project: ProjectRow & { client_id: string }, opts: { pr?: PrPayload }): Promise<Dispatch> {
  switch (kind) {
    case 'scope': {
      const r = await llmOrTemplate('scope', request, project, () => TEMPLATE_BY_STAGE.scope(request, project));
      return { ...r, nextStatus: 'scoped' };
    }
    case 'quote': {
      if (project.retainer_tier) return { resultMd: 'Retainer project — no quote required.', nextStatus: 'planned' };
      const { md, linePence } = quoteFallback(request);
      await one(
        "insert into quotes(project_id, client_email, status, line_items, total_pence, deposit_pct, sow_md) values ($1,(select email from users where id=$2),'draft',$3,$4,50,$5) returning id",
        [project.id, project.client_id, JSON.stringify([{ name: request.title, pence: linePence }]), linePence, md],
      );
      return { resultMd: md, nextStatus: 'quoted' };
    }
    case 'plan': {
      const r = await llmOrTemplate('plan', request, project, () => TEMPLATE_BY_STAGE.plan(request, project));
      return { ...r, nextStatus: 'planned' };
    }
    case 'build_prompt': {
      const scope = await one<{ result_md: string }>("select result_md from claude_runs where request_id=$1 and kind='scope' and result_md is not null order by created_at desc limit 1", [request.id]);
      const plan = await one<{ result_md: string }>("select result_md from claude_runs where request_id=$1 and kind='plan' and result_md is not null order by created_at desc limit 1", [request.id]);
      const prompt = composeBuildPrompt(project, request, { scope: scope?.result_md, plan: plan?.result_md });
      // builder.run is enqueued in Phase 6 (the builder worker consumes it).
      return { resultMd: prompt, prompt, nextStatus: 'building' };
    }
    case 'review': {
      const pr = opts.pr ?? { files: [], additions: 0, ci: 'green' as const };
      const risk = classifyRisk(pr.files, pr.additions ?? 0);
      let verdict: 'pass' | 'needs_changes' = 'pass';
      const res = await maybeLlm({ purpose: 'review', model: MODEL_BY_STAGE.review, system: SYSTEM_BY_STAGE.review, user: `Files changed:\n${pr.files.join('\n')}\n\nRequest: ${request.title}\n${request.description}`, max_tokens: 1500, ref: { kind: 'request', id: request.id } });
      if (res) verdict = /status:\s*needs_changes/i.test(res.text) ? 'needs_changes' : 'pass';
      const autoMerge = project.metadata?.auto_merge !== false;
      const killSwitchOn = await getSettingBool('auto_merge_enabled', true);
      const eligible = isAutoMergeEligible({ risk, review: verdict, ci: pr.ci ?? 'green', autoMerge, killSwitchOn });
      const md = res?.text ?? reviewMarkdown(request, risk, verdict);
      return {
        runStatus: 'awaiting_review',
        resultMd: md,
        tokensIn: res?.tokens_in,
        tokensOut: res?.tokens_out,
        costGbp: res?.cost_gbp,
        metadata: { risk, review: verdict, eligible, ci: pr.ci ?? 'green' },
        nextStatus: eligible ? 'approved' : 'review',
        risk,
        review: verdict,
        eligible,
      };
    }
    case 'deploy': {
      const r = await llmOrTemplate('deploy', request, project, () => TEMPLATE_BY_STAGE.deploy(request, project));
      return { ...r, nextStatus: 'shipped' };
    }
    default:
      return {};
  }
}

export async function runStage(requestId: string, kind: Stage, opts: { force?: boolean; pr?: PrPayload } = {}): Promise<StageResult> {
  const request = await one<RequestRow & { status: string }>('select id, title, description, project_id, status from feature_requests where id=$1', [requestId]);
  if (!request) return { error: 'request not found' };
  const project = await one<ProjectRow & { client_id: string }>(
    'select id, name, project_type, repo_url, preview_url, retainer_tier, metadata, client_id from projects where id=$1',
    [request.project_id],
  );
  if (!project) return { error: 'project not found' };

  if (!opts.force) {
    const existing = await one<{ id: string; status: string }>(
      "select id, status from claude_runs where request_id=$1 and kind=$2 and status in ('queued','running','awaiting_review','succeeded') order by created_at desc limit 1",
      [requestId, kind],
    );
    if (existing) return { reused: true, run: existing };
  }

  if (LLM_STAGES.includes(kind) && !(await withinDailyCap())) {
    const run = await one<{ id: string }>("insert into claude_runs(project_id, request_id, kind, status) values ($1,$2,$3,'cancelled') returning id", [project.id, requestId, kind]);
    await one("insert into admin_alerts(severity, kind, title, body) values ('warn','cost_cap','LLM daily cap reached',$1) returning id", [`Stage ${kind} cancelled for request ${requestId}`]);
    return { cancelled: true, run: { id: run!.id, status: 'cancelled' } };
  }

  const run = await one<{ id: string }>("insert into claude_runs(project_id, request_id, kind, status, started_at) values ($1,$2,$3,'running', now()) returning id", [project.id, requestId, kind]);
  const runId = run!.id;

  const out = await dispatch(kind, request, project, opts);

  await one(
    'update claude_runs set status=$2, result_md=$3, prompt=$4, tokens_in=$5, tokens_out=$6, cost_gbp=$7, metadata=$8, pr_url=$9, finished_at=now() where id=$1 returning id',
    [runId, out.runStatus ?? 'succeeded', out.resultMd ?? null, out.prompt ?? null, out.tokensIn ?? null, out.tokensOut ?? null, out.costGbp ?? null, JSON.stringify(out.metadata ?? {}), opts.pr?.pr_url ?? null],
  );

  if (out.nextStatus && out.nextStatus !== request.status) {
    await one('update feature_requests set status=$2 where id=$1 returning id', [requestId, out.nextStatus]);
    await activity(project.id, requestId, `claude.${kind}`, STAGE_TITLE[kind], (out.resultMd ?? '').slice(0, 280));
    if (project.client_id) await notify(project.client_id, { kind: `request_${kind}`, title: STAGE_TITLE[kind], body: request.title, link: `/app/requests/${requestId}` });
  }

  // Hand off to the builder worker (Phase 6).
  if (kind === 'build_prompt') {
    await enqueueBuilder('builder.run', {
      repo_url: project.repo_url ?? '',
      branch: `ooh/${project.id.slice(0, 8)}/${requestId.slice(0, 8)}`,
      prompt: out.prompt ?? '',
      claude_run_id: runId,
      request_id: requestId,
    });
  }
  if (kind === 'review' && out.eligible && opts.pr?.pr_url) {
    await enqueueBuilder('builder.merge', { pr_url: opts.pr.pr_url });
  }

  return {
    run: { id: runId, status: out.runStatus ?? 'succeeded' },
    risk: out.risk,
    review: out.review,
    eligible: out.eligible,
    prompt: out.prompt,
    nextStatus: out.nextStatus,
  };
}
