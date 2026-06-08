// Outreach draft + send. Ported from outreach-draft / outreach-send. campaign_id
// optional: when omitted, runs all `running` campaigns (cron-friendly). LLM
// degrades to a template; sends are suppression-checked and rate-limited; with
// no Resend key / EMAIL_DRY_RUN they record an email_events row instead.
import { z } from 'zod';
import { defineJob } from '../defineJob';
import { one, query } from '../lib/db';
import { maybeLlm } from '../lib/llm';

type Campaign = { id: string; client_id: string | null; channel: string; voice_prompt: string | null; send_rate_per_day: number; approval_mode: string };

const textToHtml = (s: string): string =>
  s
    .split('\n\n')
    .map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</p>`)
    .join('');

const DRAFT_SYSTEM =
  'You write short, personable cold outreach for a UK software studio. Mirror the voice prompt exactly. Lead with the specific signal that made you reach out. End with a single, calendar-linked CTA. <=120 words. No emojis. Return strict JSON: { "subject": string, "body": string }.';

async function campaignsToRun(campaignId?: string): Promise<Campaign[]> {
  if (campaignId) {
    const c = await one<Campaign>('select id, client_id, channel, voice_prompt, send_rate_per_day, approval_mode from outreach_campaigns where id=$1', [campaignId]);
    return c ? [c] : [];
  }
  return (await query<Campaign>("select id, client_id, channel, voice_prompt, send_rate_per_day, approval_mode from outreach_campaigns where status='running'")).rows;
}

export const outreachDraft = defineJob(
  'outreach.draft',
  z.object({ campaign_id: z.string().uuid().optional(), batch_size: z.number().optional() }),
  async (data) => {
    let drafted = 0;
    for (const campaign of await campaignsToRun(data.campaign_id)) {
      const leads = (
        await query<{ id: string; company_name: string; domain: string | null; website_status: string | null; llm_reason: string | null; contact_email: string | null; contact_name: string | null }>(
          "select id, company_name, domain, website_status, llm_reason, contact_email, contact_name from leads where status='accepted' and client_id is not distinct from $1 limit $2",
          [campaign.client_id, data.batch_size ?? 50],
        )
      ).rows;
      for (const lead of leads) {
        if (await one('select id from outreach_messages where campaign_id=$1 and lead_id=$2', [campaign.id, lead.id])) continue;
        if (lead.contact_email && (await one('select 1 as x from suppression_list where email=$1', [lead.contact_email]))) continue;

        const signals = (await query<{ kind: string; detail: string | null }>('select kind, detail from lead_signals where lead_id=$1 order by weight desc limit 3', [lead.id])).rows;
        let subject: string;
        let body: string;
        const res = await maybeLlm({
          purpose: 'draft',
          model: 'claude-sonnet-4-6',
          system: DRAFT_SYSTEM,
          user: `Voice prompt:\n${campaign.voice_prompt ?? 'Direct, founder-tone.'}\n\nLead:\n- Company: ${lead.company_name}\n- Website: ${lead.website_status}\n- Score reason: ${lead.llm_reason ?? ''}\n- Contact: ${lead.contact_name ?? ''}\nSignals:\n${signals.map((s) => `- ${s.kind}: ${s.detail ?? ''}`).join('\n') || '(none)'}\n\nWrite the email.`,
          max_tokens: 600,
          response_format: 'json',
        });
        if (res?.json) {
          const p = res.json as { subject?: string; body?: string };
          if (!p.subject || !p.body) continue;
          subject = p.subject.slice(0, 240);
          body = p.body;
        } else {
          const sig = signals[0];
          subject = `Quick idea for ${lead.company_name}`;
          body = `Hi${lead.contact_name ? ` ${lead.contact_name}` : ''},\n\nNoticed ${sig ? sig.kind.replace(/_/g, ' ') : 'your business'} — we help UK firms like ${lead.company_name} ship sites and automations fast.\n\nWorth a quick call this week?\n\n— out-of-house.dev`;
        }
        const status = campaign.approval_mode === 'auto' ? 'approved' : 'drafted';
        await one('insert into outreach_messages(campaign_id, lead_id, channel, subject, body, body_html, status) values ($1,$2,$3,$4,$5,$6,$7) returning id', [campaign.id, lead.id, campaign.channel, subject, body, textToHtml(body), status]);
        drafted++;
      }
    }
    return { drafted };
  },
);

export const outreachSend = defineJob(
  'outreach.send',
  z.object({ campaign_id: z.string().uuid().optional(), batch_size: z.number().optional() }),
  async (data) => {
    const resendKey = process.env.RESEND_API_KEY;
    const dryRun = (process.env.EMAIL_DRY_RUN ?? 'true') !== 'false';
    let sent = 0;
    for (const campaign of await campaignsToRun(data.campaign_id)) {
      const sentToday = Number((await one<{ n: number }>("select count(*)::int as n from outreach_messages where campaign_id=$1 and status='sent' and sent_at >= now() - interval '24 hours'", [campaign.id]))?.n ?? 0);
      const budget = Math.max(0, (campaign.send_rate_per_day ?? 50) - sentToday);
      if (budget === 0) continue;

      const queue = (
        await query<{ id: string; lead_id: string; subject: string | null; body: string; body_html: string | null; channel: string; contact_email: string | null }>(
          "select m.id, m.lead_id, m.subject, m.body, m.body_html, m.channel, l.contact_email from outreach_messages m join leads l on l.id=m.lead_id where m.campaign_id=$1 and m.status='approved' limit $2",
          [campaign.id, Math.min(budget, data.batch_size ?? 100)],
        )
      ).rows;

      for (const msg of queue) {
        if (msg.contact_email && (await one('select 1 as x from suppression_list where email=$1', [msg.contact_email]))) {
          await one("update outreach_messages set status='failed' where id=$1 returning id", [msg.id]);
          continue;
        }
        if (msg.channel === 'email' && msg.contact_email) {
          let ok = true;
          if (resendKey && !dryRun) {
            try {
              const r = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { Authorization: `Bearer ${resendKey}`, 'content-type': 'application/json' },
                body: JSON.stringify({ from: process.env.EMAIL_FROM ?? 'out-of-house.dev <hello@send.out-of-house.dev>', to: [msg.contact_email], subject: msg.subject, html: msg.body_html ?? msg.body, text: msg.body }),
              });
              ok = r.ok;
            } catch {
              ok = false;
            }
          }
          await one('insert into email_events(to_email, template, status, ref_kind, ref_id) values ($1,$2,$3,$4,$5) returning id', [msg.contact_email, 'outreach', ok ? 'sent' : 'queued', 'outreach_message', msg.id]);
          if (ok) {
            await one("update outreach_messages set status='sent', sent_at=now() where id=$1 returning id", [msg.id]);
            await one("update leads set status='contacted', contacted_at=now() where id=$1 returning id", [msg.lead_id]);
            sent++;
          } else {
            await one("update outreach_messages set status='failed' where id=$1 returning id", [msg.id]);
          }
        } else {
          await one("update outreach_messages set status='queued' where id=$1 returning id", [msg.id]);
        }
      }
    }
    return { sent };
  },
);
