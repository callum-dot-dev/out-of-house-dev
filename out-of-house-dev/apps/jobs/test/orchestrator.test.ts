import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestPg, type TestPg } from '../../../db/testing/pg';
import { migrate } from '../../../db/migrate';
import { seed } from '../../../db/seeds/seed';
import { runStage } from '../src/orchestrator';
import { canTransition } from '../src/orchestrator/transitions';
import { classifyRisk } from '../src/orchestrator/risk';
import { isAutoMergeEligible } from '../src/orchestrator/mergePolicy';
import { query, closePool } from '../src/lib/db';

let pg: TestPg;

beforeAll(async () => {
  pg = await startTestPg();
  process.env.DATABASE_URL = pg.url;
  process.env.NODE_ENV = 'test';
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  process.env.LLM_DAILY_CAP_GBP = '50';
  await migrate(pg.url, { silent: true });
  await seed(pg.url, { silent: true });
}, 180_000);

afterAll(async () => {
  await closePool();
  await pg?.stop();
});

async function makeRequest(projectType = 'website', style: string | undefined = 'conversion-landing', autoMerge = true) {
  const clientId = (await query<{ id: string }>("select id from users where role='client' limit 1")).rows[0].id;
  const metadata: Record<string, unknown> = { auto_merge: autoMerge };
  if (style) metadata.style = style;
  const projectId = (
    await query<{ id: string }>(
      "insert into projects(client_id, name, project_type, status, metadata) values ($1,'Pipeline Test',$2,'building',$3) returning id",
      [clientId, projectType, JSON.stringify(metadata)],
    )
  ).rows[0].id;
  const requestId = (
    await query<{ id: string }>(
      "insert into feature_requests(project_id, created_by, title, description, status) values ($1,$2,'Add hero section','Add a hero with headline and CTA above the fold.','submitted') returning id",
      [projectId, clientId],
    )
  ).rows[0].id;
  return { projectId, requestId };
}

const statusOf = async (id: string) => (await query<{ status: string }>('select status from feature_requests where id=$1', [id])).rows[0].status;

describe('state machine transitions', () => {
  it('accepts legal and rejects illegal transitions', () => {
    expect(canTransition('submitted', 'scoped')).toBe(true);
    expect(canTransition('scoped', 'planned')).toBe(true);
    expect(canTransition('planned', 'building')).toBe(true);
    expect(canTransition('building', 'review')).toBe(true);
    expect(canTransition('review', 'approved')).toBe(true);
    expect(canTransition('approved', 'deploying')).toBe(true);
    expect(canTransition('deploying', 'shipped')).toBe(true);
    // illegal
    expect(canTransition('submitted', 'shipped')).toBe(false);
    expect(canTransition('shipped', 'building')).toBe(false);
    expect(canTransition('scoped', 'approved')).toBe(false);
  });
});

describe('risk + merge policy', () => {
  it('classifies risk and gates auto-merge', () => {
    expect(classifyRisk(['apps/web/src/data/copy.md'], 30)).toBe('low');
    expect(classifyRisk(['apps/api/src/routes/auth.ts'], 50)).toBe('high');
    expect(classifyRisk(['db/migrations/0003_x.sql'], 5)).toBe('high');
    expect(classifyRisk(['apps/web/src/pages/New.tsx'], 300)).toBe('standard');
    expect(isAutoMergeEligible({ risk: 'low', review: 'pass', ci: 'green', autoMerge: true, killSwitchOn: true })).toBe(true);
    expect(isAutoMergeEligible({ risk: 'high', review: 'pass', ci: 'green', autoMerge: true, killSwitchOn: true })).toBe(false);
    expect(isAutoMergeEligible({ risk: 'low', review: 'pass', ci: 'green', autoMerge: false, killSwitchOn: true })).toBe(false);
  });
});

describe('full pipeline (stubbed LLM via no-key templates)', () => {
  it('scope -> plan -> build_prompt -> review(low) -> approved', async () => {
    const { requestId } = await makeRequest('website', 'conversion-landing', true);

    const scope = await runStage(requestId, 'scope');
    expect(scope.nextStatus).toBe('scoped');
    expect(await statusOf(requestId)).toBe('scoped');

    const plan = await runStage(requestId, 'plan');
    expect(plan.nextStatus).toBe('planned');

    const bp = await runStage(requestId, 'build_prompt');
    expect(await statusOf(requestId)).toBe('building');
    // build prompt composed via buildHandoff: contains the automation contract + active style adapter
    expect(bp.prompt).toContain('Automation contract');
    expect(bp.prompt).toContain('conversion-landing');

    const review = await runStage(requestId, 'review', { pr: { pr_url: 'https://github.com/x/pr/1', files: ['apps/web/src/data/copy.md'], additions: 30, ci: 'green' } });
    expect(review.risk).toBe('low');
    expect(review.eligible).toBe(true);
    expect(await statusOf(requestId)).toBe('approved');

    // a claude_runs row exists per stage
    const runs = (await query<{ kind: string }>('select kind from claude_runs where request_id=$1', [requestId])).rows.map((r) => r.kind);
    expect(runs).toEqual(expect.arrayContaining(['scope', 'plan', 'build_prompt', 'review']));
  });

  it('high-risk review is not eligible and routes to senior review', async () => {
    const { requestId } = await makeRequest('web_app', undefined, true);
    await runStage(requestId, 'scope');
    const review = await runStage(requestId, 'review', { pr: { files: ['apps/api/src/routes/auth.ts'], additions: 40, ci: 'green' } });
    expect(review.risk).toBe('high');
    expect(review.eligible).toBe(false);
    expect(await statusOf(requestId)).toBe('review');
  });

  it('re-running a stage reuses the existing claude_run', async () => {
    const { requestId } = await makeRequest();
    const first = await runStage(requestId, 'scope');
    const second = await runStage(requestId, 'scope');
    expect(second.reused).toBe(true);
    expect(second.run?.id).toBe(first.run?.id);
  });

  it('cost-cap breach cancels the stage and alerts', async () => {
    const { requestId } = await makeRequest();
    process.env.LLM_DAILY_CAP_GBP = '0';
    const r = await runStage(requestId, 'scope');
    process.env.LLM_DAILY_CAP_GBP = '50';
    expect(r.cancelled).toBe(true);
    expect(await statusOf(requestId)).toBe('submitted'); // unchanged
    const alerts = (await query("select 1 as x from admin_alerts where kind='cost_cap'")).rowCount;
    expect(alerts).toBeGreaterThan(0);
  });
});
