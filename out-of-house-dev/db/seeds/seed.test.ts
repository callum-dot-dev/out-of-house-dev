import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { startTestPg, type TestPg } from '../testing/pg';
import { migrate } from '../migrate';
import { seed } from './seed';

let pg: TestPg;
let client: Client;

beforeAll(async () => {
  pg = await startTestPg();
  await migrate(pg.url, { silent: true });
  client = new Client({ connectionString: pg.url });
  await client.connect();
}, 180_000);

afterAll(async () => {
  await client?.end();
  await pg?.stop();
});

const TABLES = [
  'users',
  'plan_templates',
  'programmes',
  'cohorts',
  'saas_apps',
  'logovault_brands',
  'lead_sources',
  'lead_icps',
  'outreach_campaigns',
  'uptime_checks',
  'projects',
  'feature_requests',
  'applications',
];

async function counts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of TABLES) {
    const { rows } = await client.query<{ n: number }>(`select count(*)::int as n from ${t}`);
    out[t] = rows[0].n;
  }
  return out;
}

describe('seed', () => {
  it('is idempotent and produces the expected smoke counts', async () => {
    await seed(pg.url, { silent: true });
    const first = await counts();

    await seed(pg.url, { silent: true });
    const second = await counts();

    expect(second).toEqual(first); // running twice changes nothing

    expect(first.users).toBe(3);
    expect(first.plan_templates).toBe(8);
    expect(first.programmes).toBe(6);
    expect(first.cohorts).toBe(6);
    expect(first.saas_apps).toBe(4);
    expect(first.lead_icps).toBe(2);
    expect(first.uptime_checks).toBe(1);
    expect(first.projects).toBe(1);
    expect(first.feature_requests).toBe(5);
    expect(first.applications).toBe(3);

    // views are queryable
    await client.query('select * from v_funnel_weekly');
    await client.query('select * from v_revenue_monthly');
    await client.query('select * from v_llm_costs_daily');
    await client.query('select * from certificate_verifications');
  });
});
