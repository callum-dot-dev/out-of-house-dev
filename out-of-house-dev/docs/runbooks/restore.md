# Restore drill (logical backup)

The worker writes a nightly logical backup (`ops.backup_nightly`) — a JSON dump of
every base table — to `FILE_STORE_ROOT/backups/`. Render Postgres also provides
automated point-in-time backups (the physical layer); this app-level dump is the
portable, inspectable supplement.

## Restore into a fresh database
1. Provision an empty Postgres (or `create database ooh_restore`).
2. Apply the schema: `DATABASE_URL=<target> npm run migrate`.
3. Load the data: from a Node REPL / one-off script,
   `import { restoreFromJson } from '@oohdev/jobs/dist/restore'` (or
   `apps/jobs/src/restore.ts` via tsx) →
   `await restoreFromJson('<dump>.json', '<target DATABASE_URL>')`.
   The loader sets `session_replication_role=replica` (disables FK/triggers — run
   as a superuser/owner), and is type-aware for jsonb + tsvector columns.
4. Sanity-check row counts (e.g. `select count(*) from users, plan_templates`).

## Verified by
`apps/jobs/test/jobs.test.ts` → "backup_nightly produces a restorable dump":
dump → migrate fresh DB → restore → assert users + plan_templates counts. The
weekly `ops.restore_drill` cron (Phase 10) runs this against the latest dump.

## Render physical rollback
For a time-based recovery, use Render's Postgres PITR (dashboard → database →
Recovery) — faster than a logical restore for full-cluster events.
