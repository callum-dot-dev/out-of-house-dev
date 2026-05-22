// lead-enrich
//
// Picks leads in `new` state, fetches public website meta, detects the
// website status (none / wix / squarespace / wordpress / custom / broken),
// and writes an enrichment payload back. Status flips to `enriched`.

import { handleOptions, json } from '../_shared/cors.ts';
import { admin } from '../_shared/supabase-admin.ts';

Deno.serve(async (req) => {
  const opts = handleOptions(req);
  if (opts) return opts;

  try {
    const { batch_size = 50 } = await req.json().catch(() => ({}));
    const { data: leads } = await admin
      .from('leads')
      .select('id, domain, website_url, company_name')
      .eq('status', 'new')
      .limit(batch_size);

    let processed = 0;
    for (const lead of leads || []) {
      const enrichment: Record<string, unknown> = {};
      let website_status = lead.website_url ? 'unknown' : 'none';

      if (lead.website_url) {
        try {
          const resp = await fetch(lead.website_url, { redirect: 'follow' });
          const html = (await resp.text()).slice(0, 200_000);
          enrichment.http_status = resp.status;
          enrichment.title       = (html.match(/<title>([^<]+)<\/title>/i) || [])[1];
          enrichment.description = (html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) || [])[1];
          if (!resp.ok)                 website_status = 'broken';
          else if (/wix\.com/i.test(html))                       website_status = 'wix';
          else if (/squarespace/i.test(html))                    website_status = 'squarespace';
          else if (/wp-content|wordpress/i.test(html))           website_status = 'wordpress';
          else                                                    website_status = 'custom';
        } catch {
          website_status = 'broken';
          enrichment.error = 'fetch_failed';
        }
      }

      await admin.from('leads').update({
        website_status,
        enrichment,
        status: 'enriched',
        enriched_at: new Date().toISOString(),
      }).eq('id', lead.id);

      // Add a signal if site is none / broken (= classic services prospect)
      if (website_status === 'none' || website_status === 'broken') {
        await admin.from('lead_signals').insert({
          lead_id: lead.id,
          kind: 'no_website',
          detail: website_status === 'broken' ? 'website unreachable' : 'no website discovered',
          weight: 5.0,
        });
      }
      processed++;
    }

    return json(req, { processed });
  } catch (e) {
    console.error('lead-enrich error', e);
    return json(req, { error: String(e?.message || e) }, { status: 500 });
  }
});
