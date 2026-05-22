// outreach-draft
//
// For each `accepted` lead in an active campaign, drafts a personalised
// outreach message using the campaign's voice_prompt and any detected
// lead signals. Writes one `outreach_messages` row per (campaign, lead).

import { handleOptions, json } from '../_shared/cors.ts';
import { admin } from '../_shared/supabase-admin.ts';
import { llm } from '../_shared/llm.ts';

const SYSTEM = `You write short, personable cold outreach for a UK software studio. Mirror the voice prompt exactly. Lead with the specific signal that made you reach out. End with a single, calendar-linked CTA. <=120 words. No emojis. No "I hope this finds you well". Return strict JSON: { "subject": string, "body": string }.`;

Deno.serve(async (req) => {
  const opts = handleOptions(req);
  if (opts) return opts;

  try {
    const { campaign_id, batch_size = 50 } = await req.json();
    if (!campaign_id) return json(req, { error: 'campaign_id required' }, { status: 400 });

    const { data: campaign } = await admin
      .from('outreach_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();
    if (!campaign) return json(req, { error: 'campaign not found' }, { status: 404 });

    // Eligible leads: accepted + matching campaign client + not already drafted
    const { data: leads } = await admin
      .from('leads')
      .select('id, company_name, domain, website_status, llm_reason, contact_email, contact_name')
      .eq('status', 'accepted')
      .eq('client_id', campaign.client_id)
      .limit(batch_size);

    let drafted = 0;
    for (const lead of leads || []) {
      // skip if a message already exists for (campaign, lead)
      const { count } = await admin.from('outreach_messages')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign_id)
        .eq('lead_id', lead.id);
      if ((count || 0) > 0) continue;

      const { data: signals } = await admin.from('lead_signals')
        .select('kind, detail')
        .eq('lead_id', lead.id)
        .order('weight', { ascending: false })
        .limit(3);

      const signalSummary = (signals || []).map((s) => `- ${s.kind}: ${s.detail || ''}`).join('\n');

      const userPrompt =
        `Voice prompt:\n${campaign.voice_prompt || 'Direct, lightly self-deprecating, founder-tone.'}\n\n` +
        `Lead:\n- Company: ${lead.company_name}\n- Domain: ${lead.domain}\n- Website: ${lead.website_status}\n` +
        `- Score reason: ${lead.llm_reason || ''}\n- Contact: ${lead.contact_name || ''}\n` +
        `Signals:\n${signalSummary || '(none)'}\n\nWrite the email.`;

      const res = await llm({
        model: 'claude-sonnet-4-6',
        system: SYSTEM,
        user: userPrompt,
        max_tokens: 600,
        response_format: 'json',
      });

      const parsed = (res.json as { subject?: string; body?: string }) || {};
      if (!parsed.subject || !parsed.body) continue;

      const initialStatus = campaign.approval_mode === 'auto' ? 'approved' : 'drafted';

      await admin.from('outreach_messages').insert({
        campaign_id,
        lead_id: lead.id,
        channel: campaign.channel,
        subject: parsed.subject.slice(0, 240),
        body: parsed.body,
        body_html: textToHtml(parsed.body),
        status: initialStatus,
      });
      drafted++;
    }

    return json(req, { drafted });
  } catch (e) {
    console.error('outreach-draft error', e);
    return json(req, { error: String(e?.message || e) }, { status: 500 });
  }
});

const textToHtml = (s: string) =>
  s.split('\n\n').map((p) => `<p>${escape(p).replace(/\n/g, '<br/>')}</p>`).join('');

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
