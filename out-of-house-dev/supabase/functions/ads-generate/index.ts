// ads-generate
//
// Generates ad creative variants for a campaign. Outputs to ad_creatives.
// Variants generated per call: configurable (default 5). Each is a
// (headline, body, cta) triple plus an image prompt for a generation step
// downstream (handled by ads-render).

import { handleOptions, json } from '../_shared/cors.ts';
import { admin } from '../_shared/supabase-admin.ts';
import { llm } from '../_shared/llm.ts';

const SYSTEM = `You are a senior performance marketer. Given the campaign brief and the platform, produce N ad variants. Each variant: headline <=60 chars, body <=120 chars, cta <=20 chars, image_prompt that a generative model can render. Output strict JSON: { "variants": [{ "headline": string, "body": string, "cta": string, "image_prompt": string }] }.`;

Deno.serve(async (req) => {
  const opts = handleOptions(req);
  if (opts) return opts;

  try {
    const { campaign_id, count = 5 } = await req.json();
    if (!campaign_id) return json(req, { error: 'campaign_id required' }, { status: 400 });

    const { data: campaign } = await admin
      .from('ad_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();
    if (!campaign) return json(req, { error: 'campaign not found' }, { status: 404 });

    const userPrompt = `Platform: ${campaign.platform}
Objective: ${campaign.objective}
Audience: ${JSON.stringify(campaign.audience_json || {})}
Daily budget: £${campaign.daily_budget_gbp || 'n/a'}
Brief: ${campaign.name}

Produce ${count} distinct creative variants. Be specific. Avoid AI-buzzword soup.`;

    const res = await llm({
      model: 'claude-sonnet-4-6',
      system: SYSTEM,
      user: userPrompt,
      max_tokens: 1500,
      response_format: 'json',
    });

    const variants = (res.json as { variants?: any[] })?.variants || [];
    let created = 0;
    for (const [i, v] of variants.entries()) {
      await admin.from('ad_creatives').insert({
        campaign_id,
        variant: `gen-${Date.now()}-${i}`,
        headline: v.headline,
        body: v.body,
        cta: v.cta,
        status: 'draft',
        ai_generated: true,
      });
      created++;
    }

    return json(req, { created, cost_gbp: res.cost_gbp });
  } catch (e) {
    console.error('ads-generate error', e);
    return json(req, { error: String(e?.message || e) }, { status: 500 });
  }
});
