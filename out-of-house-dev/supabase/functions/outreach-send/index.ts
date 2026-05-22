// outreach-send
//
// Picks `approved` outreach_messages for a campaign and sends them via Resend
// (email) or stages them for LinkedIn (channel=linkedin is sent through the
// Phantombuster / Apify pipeline downstream — for v1 we just mark them
// `queued` with a TODO note).
//
// Rate-limit: at most `send_rate_per_day` per campaign per day. If the limit
// is hit the leftover messages stay `approved` until the next run.

import { handleOptions, json } from '../_shared/cors.ts';
import { admin } from '../_shared/supabase-admin.ts';

Deno.serve(async (req) => {
  const opts = handleOptions(req);
  if (opts) return opts;

  try {
    const { campaign_id, batch_size = 100 } = await req.json();
    if (!campaign_id) return json(req, { error: 'campaign_id required' }, { status: 400 });

    const { data: campaign } = await admin
      .from('outreach_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();
    if (!campaign) return json(req, { error: 'campaign not found' }, { status: 404 });

    // Daily limit accounting
    const { count: sentToday } = await admin.from('outreach_messages')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign_id)
      .eq('status', 'sent')
      .gte('sent_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString());
    const budget = Math.max(0, (campaign.send_rate_per_day || 50) - (sentToday || 0));

    if (budget === 0) return json(req, { sent: 0, reason: 'daily rate limit hit' });

    const { data: queue } = await admin
      .from('outreach_messages')
      .select('id, lead_id, subject, body, body_html, channel, leads:lead_id(contact_email, contact_name)')
      .eq('campaign_id', campaign_id)
      .eq('status', 'approved')
      .limit(Math.min(budget, batch_size));

    const resendKey = Deno.env.get('RESEND_API_KEY');
    let sent = 0;
    for (const msg of queue || []) {
      const recipient = (msg as any).leads?.contact_email;
      if (msg.channel === 'email' && resendKey && recipient) {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            from: 'Out-of-house <support@out-of-house.dev>',
            to: [recipient],
            subject: msg.subject,
            html: msg.body_html || msg.body,
            text: msg.body,
          }),
        });
        if (resp.ok) {
          await admin.from('outreach_messages')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', msg.id);
          await admin.from('leads')
            .update({ status: 'contacted', contacted_at: new Date().toISOString() })
            .eq('id', msg.lead_id);
          sent++;
        } else {
          await admin.from('outreach_messages')
            .update({ status: 'failed' })
            .eq('id', msg.id);
        }
      } else {
        // LinkedIn / X / SMS — stage for downstream
        await admin.from('outreach_messages')
          .update({ status: 'queued' })
          .eq('id', msg.id);
      }
    }

    return json(req, { sent });
  } catch (e) {
    console.error('outreach-send error', e);
    return json(req, { error: String(e?.message || e) }, { status: 500 });
  }
});
