// Inbound email parsing: classify intent (LLM or heuristic) and act —
// unsubscribe -> suppression, objection/question -> admin alert.
import { z } from 'zod';
import { defineJob } from '../defineJob';
import { one, query } from '../lib/db';
import { maybeLlm } from '../lib/llm';

const INTENT_SYSTEM =
  'Classify the intent of an inbound reply to cold outreach. Return strict JSON { "intent": one of positive|meeting|question|objection|unsubscribe|bounce|other }.';

type Inbound = { id: string; from_email: string | null; subject: string | null; text_body: string | null };

function heuristicIntent(m: Inbound): string {
  const text = `${m.subject ?? ''} ${m.text_body ?? ''}`.toLowerCase();
  if (/unsubscribe|opt out|remove me|stop emailing/.test(text)) return 'unsubscribe';
  if (/delivery (has )?failed|mailer-daemon|undeliverable|bounce/.test(text)) return 'bounce';
  if (/\b(yes|interested|sounds good|let's|book|call|meeting|calendar)\b/.test(text)) return 'positive';
  if (/\?/.test(text)) return 'question';
  return 'other';
}

export const inboxParse = defineJob('inbox.parse', z.object({ id: z.string().uuid().optional() }), async (data) => {
  const rows = (
    await query<Inbound>(
      data.id ? 'select id, from_email, subject, text_body from inbound_emails where id=$1' : 'select id, from_email, subject, text_body from inbound_emails where processed_at is null limit 50',
      data.id ? [data.id] : [],
    )
  ).rows;

  let processed = 0;
  for (const m of rows) {
    let intent = heuristicIntent(m);
    const res = await maybeLlm({ purpose: 'classify', model: 'claude-haiku-4-5-20251001', system: INTENT_SYSTEM, user: `Subject: ${m.subject ?? ''}\n\n${(m.text_body ?? '').slice(0, 3000)}`, max_tokens: 50, response_format: 'json' });
    if (res?.json) {
      const p = res.json as { intent?: string };
      if (typeof p.intent === 'string') intent = p.intent;
    }

    if (intent === 'unsubscribe' && m.from_email) {
      await one("insert into suppression_list(email, reason, source) values ($1,'unsubscribe','inbound') on conflict (email) do nothing returning id", [m.from_email]);
    }
    if (intent === 'objection' || intent === 'question' || intent === 'positive' || intent === 'meeting') {
      await one("insert into admin_alerts(severity, kind, title, body) values ('info','inbound_reply',$1,$2) returning id", [`Reply (${intent}) from ${m.from_email ?? 'unknown'}`, (m.text_body ?? '').slice(0, 1000)]);
    }
    await one('update inbound_emails set intent=$2, processed_at=now() where id=$1 returning id', [m.id, intent]);
    processed++;
  }
  return { processed };
});
