// claude-orchestrate
//
// Owns the build pipeline. A client request comes in → we route it through
// a multi-stage Claude run: scope → plan → build → review → deploy. Each
// stage is a row in `claude_runs`. The function is idempotent per (request_id,
// kind) so it can be safely retried.
//
// Stages map onto the platform Plan-of-Action templates already in
// `plan_templates`, so the "build" stage emits a Claude Code handoff brief
// that an external Claude Code worker (Vercel/Render/Fly) can consume.
//
// Caller: scheduled cron OR a request status change trigger.
// Auth:   anon JWT (the admin client trusts the request after RLS check
//         on the originating request).

import { handleOptions, json } from '../_shared/cors.ts';
import { admin } from '../_shared/supabase-admin.ts';
import { llm } from '../_shared/llm.ts';

type Stage = 'scope' | 'plan' | 'build' | 'review' | 'deploy';

const SYSTEM_BY_STAGE: Record<Stage, string> = {
  scope: `You are a senior delivery lead at out-of-house.dev. Read the client's request and write a 1-page scope: problem, what we will ship, what we will NOT ship, acceptance criteria, and risks. Be specific, terse, and grounded in what is technically possible. Output markdown.`,
  plan: `You are a senior staff engineer planning a build at out-of-house.dev. Produce a step-by-step plan with: files to create/edit (paths), data model changes, edge-function additions, frontend pages, and a verification checklist. Output markdown.`,
  build: `You are preparing the prompt that will be handed to Claude Code (a separate, headless Claude with tool access to a real worktree). Translate the plan into a single, self-contained Claude Code prompt: include the repo layout, the existing patterns to mirror, the exact files to change, and the verification steps. Output markdown.`,
  review: `You are a senior reviewer. Given a diff and a target spec, identify correctness issues, missing acceptance criteria, security risks, and regressions. Output a structured markdown review with a final \`status: pass | needs_changes\` line.`,
  deploy: `You are a release engineer. Output the deployment runbook: PR merge target, any DB migrations to run (in order), env vars to set, smoke tests to run, and the rollback procedure. Output markdown.`,
};

const MODEL_BY_STAGE: Record<Stage, string> = {
  scope:  'claude-sonnet-4-6',
  plan:   'claude-opus-4-7',
  build:  'claude-opus-4-7',
  review: 'claude-sonnet-4-6',
  deploy: 'claude-haiku-4-5-20251001',
};

Deno.serve(async (req) => {
  const optionsRes = handleOptions(req);
  if (optionsRes) return optionsRes;

  try {
    const { request_id, stage, force = false } = await req.json();
    if (!request_id || !stage) return json(req, { error: 'request_id + stage required' }, { status: 400 });
    if (!SYSTEM_BY_STAGE[stage as Stage]) return json(req, { error: 'unknown stage' }, { status: 400 });

    // De-dupe — never run the same stage twice for the same request unless forced.
    if (!force) {
      const { data: existing } = await admin
        .from('claude_runs')
        .select('id, status, result_md')
        .eq('request_id', request_id)
        .eq('kind', stage)
        .in('status', ['queued', 'running', 'awaiting_review', 'succeeded'])
        .maybeSingle();
      if (existing) return json(req, { reused: true, run: existing });
    }

    // Load the originating request + project
    const { data: reqRow, error: reqErr } = await admin
      .from('feature_requests')
      .select('id, title, description, project_id, projects:project_id(*)')
      .eq('id', request_id)
      .single();
    if (reqErr) throw reqErr;

    // Insert a queued run
    const { data: runRow } = await admin
      .from('claude_runs')
      .insert({
        project_id: reqRow.project_id,
        request_id: reqRow.id,
        kind: stage,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    const promptText = buildUserPrompt(stage as Stage, reqRow);

    const res = await llm({
      model: MODEL_BY_STAGE[stage as Stage] as never,
      system: SYSTEM_BY_STAGE[stage as Stage],
      user: promptText,
      max_tokens: 4096,
    });

    const next_status = stage === 'review' ? 'awaiting_review' : 'succeeded';

    await admin
      .from('claude_runs')
      .update({
        status: next_status,
        result_md: res.text,
        prompt: promptText,
        tokens_in: res.tokens_in,
        tokens_out: res.tokens_out,
        cost_gbp: res.cost_gbp,
        finished_at: new Date().toISOString(),
      })
      .eq('id', runRow!.id);

    // Activity event so the client sees progress
    await admin.from('activity_events').insert({
      project_id: reqRow.project_id,
      request_id: reqRow.id,
      kind: `claude.${stage}`,
      title: stageTitle(stage as Stage),
      body: stageBlurb(stage as Stage, res.text),
    });

    return json(req, {
      run_id: runRow!.id,
      stage,
      status: next_status,
      result_md: res.text,
      cost_gbp: res.cost_gbp,
    });
  } catch (e) {
    console.error('claude-orchestrate error', e);
    return json(req, { error: String(e?.message || e) }, { status: 500 });
  }
});

const buildUserPrompt = (stage: Stage, reqRow: any) => {
  const project = reqRow.projects || {};
  const base =
    `Project: ${project.name || '(untitled)'}\n` +
    `Type: ${project.project_type || 'unknown'}\n` +
    `Repo: ${project.repo_url || '(none)'}\n` +
    `Preview: ${project.preview_url || '(none)'}\n\n` +
    `Request title: ${reqRow.title}\n` +
    `Request body:\n${reqRow.description}\n`;
  return base;
};

const stageTitle = (s: Stage) =>
  ({ scope: 'Scope drafted', plan: 'Plan written', build: 'Build prompt prepared', review: 'Review complete', deploy: 'Deployment runbook ready' }[s]);

const stageBlurb = (s: Stage, md: string) => {
  const firstPara = md.split('\n\n')[0] || md.slice(0, 240);
  return firstPara.slice(0, 480);
};
