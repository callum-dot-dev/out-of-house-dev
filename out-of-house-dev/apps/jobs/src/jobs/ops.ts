// Ops crons: uptime, nightly backup, cost rollup, stripe reconcile, disk watch.
import { z } from 'zod';
import { createWriteStream, mkdirSync, statSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { defineJob } from '../defineJob';
import { one, query } from '../lib/db';

export const opsUptimeCheck = defineJob('ops.uptime_check', z.object({}), async () => {
  const checks = (await query<{ id: string; target_url: string; client_site_id: string | null }>('select id, target_url, client_site_id from uptime_checks where enabled=true')).rows;
  let checked = 0;
  for (const c of checks) {
    let ok = false;
    let status = 0;
    const t0 = Date.now();
    try {
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(c.target_url, { signal: ctrl.signal, redirect: 'follow' });
      clearTimeout(tm);
      status = r.status;
      ok = r.ok;
    } catch {
      ok = false;
    }
    const latency = Date.now() - t0;
    await one('insert into uptime_results(check_id, ok, status_code, latency_ms) values ($1,$2,$3,$4) returning id', [c.id, ok, status || null, latency]);

    const recent = (await query<{ ok: boolean }>('select ok from uptime_results where check_id=$1 order by ts desc limit 3', [c.id])).rows;
    if (recent.length === 3 && recent.every((r) => !r.ok)) {
      const open = await one('select id from status_incidents where client_site_id is not distinct from $1 and resolved_at is null', [c.client_site_id]);
      if (!open) await one("insert into status_incidents(client_site_id, title, severity) values ($1,$2,'major') returning id", [c.client_site_id, `Down: ${c.target_url}`]);
    } else if (recent.length === 3 && recent.every((r) => r.ok)) {
      await one('update status_incidents set resolved_at=now() where client_site_id is not distinct from $1 and resolved_at is null returning id', [c.client_site_id]);
    }
    checked++;
  }
  return { checked };
});

// Portable logical backup: a JSON dump of every base table. Restorable on any
// platform (no pg_dump dependency) via the migration runner + restoreFromJson.
// (Render Postgres additionally provides automated point-in-time backups.)
export const opsBackupNightly = defineJob('ops.backup_nightly', z.object({}), async () => {
  const base = process.env.FILE_STORE_ROOT || join(process.cwd(), '.data');
  const dir = join(base, 'backups');
  mkdirSync(dir, { recursive: true });
  const outPath = join(dir, `backup-${process.hrtime.bigint().toString()}.json`);

  const tables = (
    await query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name",
    )
  ).rows.map((r) => r.table_name);

  const out = createWriteStream(outPath, { encoding: 'utf8' });
  out.write('{"version":1,"tables":{');
  let firstTable = true;
  let totalRows = 0;
  for (const t of tables) {
    const rows = (await query(`select * from "${t}"`)).rows;
    totalRows += rows.length;
    if (!firstTable) out.write(',');
    firstTable = false;
    out.write(`${JSON.stringify(t)}:${JSON.stringify(rows)}`);
  }
  out.write('}}');
  await new Promise<void>((resolve) => out.end(() => resolve()));

  const bytes = statSync(outPath).size;
  await one('insert into backups_log(kind, path, bytes, ok) values ($1,$2,$3,true) returning id', ['json', outPath, bytes]);

  try {
    const cutoff = Date.now() - 14 * 86_400_000;
    for (const f of readdirSync(dir)) {
      const full = join(dir, f);
      if (f.endsWith('.json') && statSync(full).mtimeMs < cutoff) unlinkSync(full);
    }
  } catch {
    /* ignore prune errors */
  }
  return { path: outPath, bytes, tables: tables.length, rows: totalRows };
});

export const opsCostRollupDaily = defineJob('ops.cost_rollup_daily', z.object({}), async () => {
  const row = await one<{ pence: number }>('select coalesce(sum(cost_pence),0)::int as pence from llm_calls where created_at >= current_date');
  const spentGbp = (row?.pence ?? 0) / 100;
  const cap = Number(process.env.LLM_DAILY_CAP_GBP ?? 50);
  if (spentGbp > cap) {
    await one("insert into admin_alerts(severity, kind, title, body) values ('warn','cost_cap','LLM daily cost cap exceeded',$1) returning id", [`£${spentGbp.toFixed(2)} > £${cap}`]);
  }
  return { spent_gbp: spentGbp, cap };
});

export const opsStripeReconcileNightly = defineJob('ops.stripe_reconcile_nightly', z.object({}), async () => {
  if (!process.env.STRIPE_SECRET_KEY) return { skipped: true, reason: 'stripe not configured' };
  // Full reconciliation (compare yesterday's Stripe charges to payments rows) is
  // wired with the live key in Phase 11.
  return { checked: 0 };
});

export const opsDiskWatch = defineJob('ops.disk_watch', z.object({}), async () => {
  try {
    const { statfs } = await import('node:fs/promises');
    const root = process.env.FILE_STORE_ROOT || process.cwd();
    const s = await statfs(root);
    const usedPct = 100 * (1 - s.bfree / s.blocks);
    if (usedPct > 80) {
      await one("insert into admin_alerts(severity, kind, title, body) values ('warn','disk','Disk usage high',$1) returning id", [`${usedPct.toFixed(1)}% used`]);
    }
    return { used_pct: Math.round(usedPct) };
  } catch {
    return { used_pct: -1 };
  }
});
