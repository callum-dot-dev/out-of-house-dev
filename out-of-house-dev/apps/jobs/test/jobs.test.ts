import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { Client } from 'pg';
import { startTestPg, type TestPg } from '../../../db/testing/pg';
import { migrate } from '../../../db/migrate';
import { seed } from '../../../db/seeds/seed';
import { startBoss, stopBoss, getBoss } from '../src/boss';
import { registerWorker, runJobHandler, type JobDef, type JobOpts } from '../src/defineJob';
import { ALL_JOBS } from '../src/registry';
import { opsBackupNightly } from '../src/jobs/ops';
import { restoreFromJson } from '../src/restore';
import { query, closePool } from '../src/lib/db';

let pg: TestPg;
let fileRoot: string;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function makeDef(name: string, handler: (d: unknown) => Promise<unknown>, opts: JobOpts): JobDef<unknown> {
  return { name, schema: z.object({}).passthrough(), handler, opts: { retryLimit: 0, retryDelay: 0, retryBackoff: false, ...opts } };
}

beforeAll(async () => {
  pg = await startTestPg();
  process.env.DATABASE_URL = pg.url;
  process.env.NODE_ENV = 'test';
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  fileRoot = mkdtempSync(join(tmpdir(), 'oohjobs-'));
  process.env.FILE_STORE_ROOT = fileRoot;

  await migrate(pg.url, { silent: true });
  await seed(pg.url, { silent: true });
  await startBoss();
}, 180_000);

afterAll(async () => {
  await stopBoss();
  await closePool();
  await pg?.stop();
  if (fileRoot) try { rmSync(fileRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe('every registered job handler executes (degraded, no keys)', () => {
  it('runs all ALL_JOBS handlers with a valid empty payload', async () => {
    expect(ALL_JOBS.length).toBeGreaterThanOrEqual(14);
    for (const def of ALL_JOBS) {
      const result = await runJobHandler(def, {});
      expect(result).toBeDefined();
    }
  }, 60_000);
});

describe('pg-boss runtime', () => {
  it('delivers an enqueued job to its worker', async () => {
    let resolveEcho: (v: string) => void = () => undefined;
    const echoed = new Promise<string>((r) => (resolveEcho = r));
    const def = makeDef('test.echo', async (d) => {
      resolveEcho((d as { msg: string }).msg);
      return {};
    }, {});
    def.schema = z.object({ msg: z.string() }) as unknown as JobDef<unknown>['schema'];
    await registerWorker(def);
    await getBoss().send('test.echo', { msg: 'hello-jobs' }, {});
    const got = await Promise.race([echoed, sleep(15_000).then(() => 'TIMEOUT')]);
    expect(got).toBe('hello-jobs');
  }, 30_000);

  it('retries a flaky handler and succeeds on the third attempt', async () => {
    let attempts = 0;
    let resolveDone: (n: number) => void = () => undefined;
    const done = new Promise<number>((r) => (resolveDone = r));
    const def = makeDef('test.flaky', async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('transient boom');
      resolveDone(attempts);
      return {};
    }, { retryLimit: 5, retryDelay: 0, retryBackoff: false });
    await registerWorker(def);
    await getBoss().send('test.flaky', {}, { retryLimit: 5, retryDelay: 0, retryBackoff: false });
    const finalAttempts = await Promise.race([done, sleep(25_000).then(() => -1)]);
    expect(finalAttempts).toBe(3);
  }, 40_000);

  it('writes an admin_alert on final failure', async () => {
    const def = makeDef('test.always_fail', async () => {
      throw new Error('permanent boom');
    }, { retryLimit: 1, retryDelay: 0, retryBackoff: false });
    await registerWorker(def);
    await getBoss().send('test.always_fail', {}, { retryLimit: 1, retryDelay: 0, retryBackoff: false });

    let found = false;
    for (let i = 0; i < 80; i++) {
      const r = await query("select 1 as x from admin_alerts where kind='job_failed' and title like '%test.always_fail%'");
      if (r.rowCount > 0) {
        found = true;
        break;
      }
      await sleep(300);
    }
    expect(found).toBe(true);
  }, 40_000);
});

describe('ops.backup_nightly produces a restorable dump', () => {
  it('json-dumps and restores into a fresh scratch database', async () => {
    const result = (await runJobHandler(opsBackupNightly, {})) as { path: string; bytes: number; rows: number };
    expect(result.bytes).toBeGreaterThan(500);
    expect(result.rows).toBeGreaterThan(0);
    expect(existsSync(result.path)).toBe(true);

    // fresh UTF8 scratch DB on the same cluster: migrate schema, then load data
    const adminUrl = pg.url.replace(/\/ooh_test$/, '/postgres');
    const admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query('drop database if exists ooh_restore');
    await admin.query("create database ooh_restore template template0 encoding 'UTF8' lc_collate 'C' lc_ctype 'C'");
    await admin.end();

    const restoreUrl = pg.url.replace(/\/ooh_test$/, '/ooh_restore');
    await migrate(restoreUrl, { silent: true });
    const restored = await restoreFromJson(result.path, restoreUrl);
    expect(restored.rows).toBeGreaterThan(0);

    const rc = new Client({ connectionString: restoreUrl });
    await rc.connect();
    const users = (await rc.query<{ n: number }>('select count(*)::int as n from users')).rows[0].n;
    const templates = (await rc.query<{ n: number }>('select count(*)::int as n from plan_templates')).rows[0].n;
    await rc.end();
    expect(users).toBeGreaterThanOrEqual(3);
    expect(templates).toBe(8);
  }, 60_000);
});
