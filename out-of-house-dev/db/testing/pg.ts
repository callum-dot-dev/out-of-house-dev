// Boots a throwaway real Postgres via embedded-postgres (no Docker needed).
// Used by the db + (later) api/jobs integration tests on this machine; CI uses
// a postgres:16 service container instead and just sets DATABASE_URL_TEST.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from 'pg';

export type TestPg = { url: string; stop: () => Promise<void> };

export async function startTestPg(): Promise<TestPg> {
  // embedded-postgres is ESM-only; load it with a dynamic import from this CJS module.
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const dir = mkdtempSync(join(tmpdir(), 'oohpg-'));
  // Random high port to avoid collisions across parallel test files.
  const port = 49152 + Math.floor(Math.random() * 12000);
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    user: 'ooh',
    password: 'ooh',
    port,
    persistent: false,
  });
  await pg.initialise();
  await pg.start();
  // initdb on Windows defaults the cluster to WIN1252; create the test DB as
  // UTF8 explicitly (template0 + C locale) so non-Latin1 seed text stores.
  // Production Postgres (Linux) is already UTF8 — this is a test-harness detail.
  const admin = new Client({ connectionString: `postgres://ooh:ooh@127.0.0.1:${port}/postgres` });
  await admin.connect();
  await admin.query("create database ooh_test with encoding 'UTF8' template template0 lc_collate 'C' lc_ctype 'C'");
  await admin.end();
  const url = `postgres://ooh:ooh@127.0.0.1:${port}/ooh_test`;
  return {
    url,
    async stop() {
      try {
        await pg.stop();
      } catch {
        /* ignore */
      }
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    },
  };
}
