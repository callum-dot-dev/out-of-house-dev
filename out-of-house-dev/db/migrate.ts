// Tiny forward-only migration runner.
// Applies db/migrations/*.sql in filename order, each in its own transaction,
// and records (filename, sha256, applied_at) in schema_migrations. Re-runs are
// no-ops; a changed checksum on an already-applied file is a hard error
// (migrations are immutable once shipped).
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { Client } from 'pg';

const MIGRATIONS_DIR = join(__dirname, 'migrations');

export type MigrateResult = { applied: string[]; alreadyApplied: number };

export async function migrate(
  databaseUrl: string | undefined = process.env.DATABASE_URL,
  opts: { silent?: boolean } = {},
): Promise<MigrateResult> {
  if (!databaseUrl) throw new Error('DATABASE_URL not set');
  const log = (m: string) => {
    if (!opts.silent) console.log(m);
  };
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`
      create table if not exists schema_migrations (
        filename   text primary key,
        checksum   text not null,
        applied_at timestamptz not null default now()
      )`);

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const { rows } = await client.query<{ filename: string; checksum: string }>(
      'select filename, checksum from schema_migrations',
    );
    const applied = new Map(rows.map((r) => [r.filename, r.checksum]));

    const newlyApplied: string[] = [];
    for (const file of files) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');

      const prev = applied.get(file);
      if (prev !== undefined) {
        if (prev !== checksum) {
          throw new Error(
            `Checksum drift for ${file}: applied migrations are immutable. ` +
              `Create a new migration instead of editing this one.`,
          );
        }
        continue;
      }

      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into schema_migrations(filename, checksum) values ($1, $2)', [
          file,
          checksum,
        ]);
        await client.query('commit');
        newlyApplied.push(file);
        log(`  ✓ applied ${file}`);
      } catch (err) {
        await client.query('rollback');
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }

    log(newlyApplied.length ? `Applied ${newlyApplied.length} migration(s).` : 'Database up to date.');
    return { applied: newlyApplied, alreadyApplied: applied.size };
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  migrate().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
