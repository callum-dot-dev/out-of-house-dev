// Restore a logical JSON backup (from ops.backup_nightly) into a target DB whose
// schema has already been created by the migration runner. Disables triggers/FK
// for the load (session_replication_role=replica — requires a superuser/owner
// role, which the documented restore runbook uses). Type-aware for jsonb +
// tsvector columns.
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

type ColMeta = { name: string; dataType: string; udtName: string };

async function columnsOf(client: Client, table: string): Promise<Map<string, ColMeta>> {
  const { rows } = await client.query<{ column_name: string; data_type: string; udt_name: string }>(
    "select column_name, data_type, udt_name from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position",
    [table],
  );
  return new Map(rows.map((r) => [r.column_name, { name: r.column_name, dataType: r.data_type, udtName: r.udt_name }]));
}

export async function restoreFromJson(dumpPath: string, targetUrl: string): Promise<{ tables: number; rows: number }> {
  const data = JSON.parse(readFileSync(dumpPath, 'utf8')) as { tables: Record<string, Array<Record<string, unknown>>> };
  const client = new Client({ connectionString: targetUrl });
  await client.connect();
  let insertedRows = 0;
  let tableCount = 0;
  try {
    await client.query('set session_replication_role = replica');
    for (const [table, rows] of Object.entries(data.tables)) {
      if (!rows.length) continue;
      const meta = await columnsOf(client, table);
      let touched = false;
      for (const row of rows) {
        const cols = Object.keys(row).filter((c) => meta.has(c));
        if (!cols.length) continue;
        const placeholders: string[] = [];
        const vals: unknown[] = [];
        cols.forEach((c, i) => {
          const m = meta.get(c)!;
          let v: unknown = row[c];
          let ph = `$${i + 1}`;
          if (m.dataType === 'jsonb' || m.dataType === 'json') {
            v = v === null ? null : JSON.stringify(v);
            ph = `$${i + 1}::jsonb`;
          } else if (m.udtName === 'tsvector') {
            ph = `$${i + 1}::tsvector`;
          }
          placeholders.push(ph);
          vals.push(v);
        });
        await client.query(
          `insert into "${table}" (${cols.map((c) => `"${c}"`).join(',')}) values (${placeholders.join(',')}) on conflict do nothing`,
          vals,
        );
        insertedRows++;
        touched = true;
      }
      if (touched) tableCount++;
    }
    await client.query('reset session_replication_role');
  } finally {
    await client.end();
  }
  return { tables: tableCount, rows: insertedRows };
}
