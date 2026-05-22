// lead-score
//
// Picks leads in `enriched` state, sends each to an LLM with the ICP prompt,
// stores the 1-10 score + reason. Leads >=6 advance to `accepted`. Leads
// <6 go to `rejected`. Both transitions are reversible by an admin.

import { handleOptions, json } from '../_shared/cors.ts';
import { admin } from '../_shared/supabase-admin.ts';
import { llm } from '../_shared/llm.ts';

const SYSTEM = `You are a sales analyst at a UK software studio. Given an ICP description and a candidate company, score 1-10 (10 = perfect) and write a one-sentence reason. Be strict — 7+ should be uncommon. Return strict JSON: { "score": number, "reason": string }.`;

Deno.serve(async (req) => {
  const opts = handleOptions(req);
  if (opts) return opts;

  try {
    const { batch_size = 50, accept_threshold = 6 } = await req.json().catch(() => ({}));

    const { data: leads } = await admin
      .from('leads')
      .select('id, company_name, domain, website_status, industry, enrichment, icp_id, lead_icps:icp_id(prompt, name)')
      .eq('status', 'enriched')
      .limit(batch_size);

    let scored = 0;
    for (const lead of leads || []) {
      const icpPrompt = (lead as any).lead_icps?.prompt
        || 'Small UK business that could benefit from a same-day website or a custom AI automation.';

      const userPrompt =
        `ICP:\n${icpPrompt}\n\n` +
        `Candidate:\n` +
        `- Name: ${lead.company_name}\n` +
        `- Domain: ${lead.domain || '(none)'}\n` +
        `- Website status: ${lead.website_status}\n` +
        `- Industry: ${lead.industry || '(unknown)'}\n` +
        `- Enrichment: ${JSON.stringify(lead.enrichment || {}).slice(0, 1500)}\n`;

      const res = await llm({
        model: 'claude-haiku-4-5-20251001',
        system: SYSTEM,
        user: userPrompt,
        max_tokens: 200,
        response_format: 'json',
      });

      const parsed = (res.json as { score?: number; reason?: string }) || {};
      const score = typeof parsed.score === 'number' ? parsed.score : Number(parsed.score) || 0;
      const reason = parsed.reason || res.text.slice(0, 300);
      const nextStatus = score >= accept_threshold ? 'accepted' : 'rejected';

      await admin.from('leads').update({
        llm_score: score,
        llm_reason: reason,
        scored_at: new Date().toISOString(),
        status: nextStatus,
      }).eq('id', lead.id);

      scored++;
    }

    return json(req, { scored });
  } catch (e) {
    console.error('lead-score error', e);
    return json(req, { error: String(e?.message || e) }, { status: 500 });
  }
});
