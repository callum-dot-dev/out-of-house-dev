// Reporting: weekly per-project digest, monthly impact, weekly funnel.
import { z } from 'zod';
import { defineJob } from '../defineJob';
import { one, query } from '../lib/db';
import { maybeLlm } from '../lib/llm';

const DIGEST_SYSTEM =
  'You are writing a Monday morning summary email for a client. Read the activity events from the past 7 days. Output Markdown: a friendly 2-sentence opener, a "Shipped" list, an "In progress" list, an "Asks" list, and a one-line outlook. No emojis.';

type Ev = { kind: string; title: string; body: string | null; created_at: string };

function digestFallback(name: string, events: Ev[]): string {
  const by = (k: string) => events.filter((e) => e.kind.includes(k)).map((e) => `- ${e.title}`);
  const shipped = by('shipped').concat(events.filter((e) => /shipped/i.test(e.title)).map((e) => `- ${e.title}`));
  return [
    `# ${name} — weekly update`,
    '',
    `Here's what moved on **${name}** this week.`,
    '',
    '## Shipped',
    ...(shipped.length ? shipped : ['- (nothing shipped yet)']),
    '',
    '## Activity',
    ...events.slice(-12).map((e) => `- ${e.kind}: ${e.title}`),
  ].join('\n');
}

export const reportsDigestWeekly = defineJob('reports.digest_weekly', z.object({ project_id: z.string().uuid().optional() }), async (data) => {
  const projects = (
    await query<{ id: string; name: string }>(
      data.project_id ? "select id, name from projects where id=$1 and status in ('discovery','building','live')" : "select id, name from projects where status in ('discovery','building','live')",
      data.project_id ? [data.project_id] : [],
    )
  ).rows;
  const start = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const periodStart = start.toISOString().slice(0, 10);
  const periodEnd = new Date().toISOString().slice(0, 10);

  let written = 0;
  for (const p of projects) {
    const events = (await query<Ev>('select kind, title, body, created_at from activity_events where project_id=$1 and created_at >= $2 order by created_at asc', [p.id, start])).rows;
    if (!events.length) continue;
    const res = await maybeLlm({
      purpose: 'summarise',
      model: 'claude-sonnet-4-6',
      system: DIGEST_SYSTEM,
      user: `Project: ${p.name}\nActivity events:\n${events.map((e) => `- [${e.created_at}] ${e.kind}: ${e.title}${e.body ? ' — ' + e.body : ''}`).join('\n')}`,
      max_tokens: 1200,
    });
    const content = res?.text ?? digestFallback(p.name, events);
    await one(
      'insert into digests(project_id, period_start, period_end, content_md, generated_by) values ($1,$2,$3,$4,$5) on conflict (project_id, period_start) do update set content_md=excluded.content_md, generated_by=excluded.generated_by returning id',
      [p.id, periodStart, periodEnd, content, res?.model ?? 'template'],
    );
    written++;
  }
  return { written };
});

export const reportsMonthlyImpact = defineJob('reports.monthly_impact', z.object({}), async () => {
  const projects = (await query<{ id: string }>("select id from projects where retainer_tier is not null or status='live'")).rows;
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const periodEnd = now.toISOString().slice(0, 10);
  let written = 0;
  for (const p of projects) {
    const shipped = (await query<{ n: number }>("select count(*)::int as n from feature_requests where project_id=$1 and status='shipped'", [p.id])).rows[0];
    await one(
      'insert into monthly_reports(project_id, period_start, period_end, metrics) values ($1,$2,$3,$4) on conflict (project_id, period_start) do update set metrics=excluded.metrics returning id',
      [p.id, periodStart, periodEnd, JSON.stringify({ shipped: shipped.n })],
    );
    written++;
  }
  return { written };
});

export const reportsFunnelWeekly = defineJob('reports.funnel_weekly', z.object({}), async () => {
  const rows = (await query('select * from v_funnel_weekly limit 8')).rows;
  await one("insert into admin_alerts(severity, kind, title, body) values ('info','funnel_weekly','Weekly funnel report',$1) returning id", [JSON.stringify(rows).slice(0, 2000)]);
  return { weeks: rows.length };
});
