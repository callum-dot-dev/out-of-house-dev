// digest-weekly
//
// Generates a weekly AI summary per active project. Writes to `digests`.
// Designed to be invoked every Monday morning via Supabase cron.

import { handleOptions, json } from '../_shared/cors.ts';
import { admin } from '../_shared/supabase-admin.ts';
import { llm } from '../_shared/llm.ts';

const SYSTEM = `You are writing a Monday morning summary email for a client. Read the activity events from the past 7 days. Output Markdown: a friendly 2-sentence opener, a "shipped" bulleted list, a "in progress" list, an "asks" list (anything that needs the client's input), and a one-line outlook for the week. No emojis.`;

Deno.serve(async (req) => {
  const opts = handleOptions(req);
  if (opts) return opts;

  try {
    const { project_id } = await req.json().catch(() => ({}));
    const projectsQuery = admin
      .from('projects')
      .select('id, name')
      .in('status', ['discovery', 'building']);
    const { data: projects } = project_id
      ? await projectsQuery.eq('id', project_id)
      : await projectsQuery;

    const periodEnd = new Date();
    const periodStart = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    let written = 0;
    for (const p of projects || []) {
      const { data: events } = await admin
        .from('activity_events')
        .select('kind, title, body, created_at')
        .eq('project_id', p.id)
        .gte('created_at', periodStart.toISOString())
        .order('created_at', { ascending: true });

      if (!events?.length) continue;

      const userPrompt = `Project: ${p.name}\nWindow: ${periodStart.toDateString()} → ${periodEnd.toDateString()}\nActivity events:\n` +
        events.map((e) => `- [${e.created_at}] ${e.kind}: ${e.title}${e.body ? ' — ' + e.body : ''}`).join('\n');

      const res = await llm({
        model: 'claude-sonnet-4-6',
        system: SYSTEM,
        user: userPrompt,
        max_tokens: 1200,
      });

      await admin.from('digests').upsert({
        project_id: p.id,
        period_start: periodStart.toISOString().slice(0, 10),
        period_end: periodEnd.toISOString().slice(0, 10),
        content_md: res.text,
        generated_by: res.model,
      }, { onConflict: 'project_id,period_start' });
      written++;
    }

    return json(req, { written });
  } catch (e) {
    console.error('digest-weekly error', e);
    return json(req, { error: String(e?.message || e) }, { status: 500 });
  }
});
