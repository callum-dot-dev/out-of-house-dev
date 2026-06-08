// Funnel jobs: pre-call briefs (research before discovery calls) + the expand
// loop (testimonial / case-study / referral / QBR nudges after go-live).
import { z } from 'zod';
import { defineJob } from '../defineJob';
import { one, query } from '../lib/db';

export const funnelPrecallBrief = defineJob('funnel.precall_brief', z.object({ booking_id: z.string().uuid().optional() }), async (data) => {
  const bookings = (
    await query<{ id: string; name: string | null; email: string | null; starts_at: string }>(
      data.booking_id
        ? 'select id, name, email, starts_at from meeting_bookings where id=$1'
        : "select id, name, email, starts_at from meeting_bookings where kind='discovery' and status='booked' and starts_at between now() and now() + interval '2 hours'",
      data.booking_id ? [data.booking_id] : [],
    )
  ).rows;
  let briefed = 0;
  for (const b of bookings) {
    const brief = [`# Pre-call brief — ${b.name ?? b.email}`, `Meeting: ${b.starts_at}`, '- Fetch their site + run an AISEO audit before the call.', '- Companies House + recent-news lookup.', '- Pull any prior application/lead context.'].join('\n');
    await one("insert into admin_alerts(severity, kind, title, body) values ('info','precall_brief',$1,$2) returning id", [`Pre-call brief: ${b.name ?? b.email}`, brief]);
    await one("insert into email_events(to_email, template, status, ref_kind, ref_id) values ($1,'precall-brief','queued','meeting',$2) returning id", [process.env.ADMIN_ALERT_EMAIL ?? 'callum.saxon@elevatesl.co.uk', b.id]);
    briefed++;
  }
  return { briefed };
});

export const funnelExpandLoop = defineJob('funnel.expand_loop', z.object({}), async () => {
  const projects = (await query<{ id: string; email: string | null }>("select p.id, u.email from projects p join users u on u.id=p.client_id where p.status='live'")).rows;
  let acted = 0;
  for (const p of projects) {
    if (!p.email) continue;
    const hasTestimonial = await one('select 1 as x from testimonials where project_id=$1', [p.id]);
    if (!hasTestimonial) {
      await one("insert into email_events(to_email, template, status, ref_kind, ref_id) values ($1,'testimonial-ask','queued','project',$2) returning id", [p.email, p.id]);
      acted++;
    }
  }
  return { acted };
});
