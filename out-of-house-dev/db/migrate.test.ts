import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { startTestPg, type TestPg } from './testing/pg';
import { migrate } from './migrate';

let pg: TestPg;

beforeAll(async () => {
  pg = await startTestPg();
}, 180_000);

afterAll(async () => {
  await pg?.stop();
});

describe('migration runner', () => {
  it('applies all migrations and is a no-op on re-run', async () => {
    const first = await migrate(pg.url, { silent: true });
    expect(first.applied).toContain('0001_baseline.sql');
    expect(first.applied).toContain('0002_v4_platform.sql');

    const second = await migrate(pg.url, { silent: true });
    expect(second.applied).toHaveLength(0);
  });

  it('refuses checksum drift on an already-applied migration', async () => {
    const c = new Client({ connectionString: pg.url });
    await c.connect();
    await c.query("update schema_migrations set checksum = 'tampered' where filename = '0001_baseline.sql'");
    await c.end();

    await expect(migrate(pg.url, { silent: true })).rejects.toThrow(/drift/i);
  });
});
