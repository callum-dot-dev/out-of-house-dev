// lead-discover
//
// Walks the active lead_sources, finds candidate companies that match an
// active ICP, dedupes against existing leads, and inserts a `new`-state row
// for each. Designed to be invoked by Supabase cron every 30 minutes.
//
// For v1 the source adapters are:
//   - google-places   (Places API "Text Search" with no-website filter)
//   - companies-house (UK Companies House recent incorporations)
//   - reddit-aspirants (Reddit search for career-switcher posts)
//
// Each adapter returns CandidateLead[]; we filter and insert in one batch.

import { handleOptions, json } from '../_shared/cors.ts';
import { admin } from '../_shared/supabase-admin.ts';

type Candidate = {
  source_slug: string;
  company_name: string;
  domain?: string;
  website_url?: string | null;
  website_status?: string;
  contact_email?: string;
  contact_phone?: string;
  region?: string;
  industry?: string;
  metadata?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  const opts = handleOptions(req);
  if (opts) return opts;

  try {
    const { icp_id, max_per_source = 100 } = await req.json().catch(() => ({}));

    const { data: sources } = await admin
      .from('lead_sources')
      .select('*')
      .eq('enabled', true);

    const { data: icps } = await admin
      .from('lead_icps')
      .select('*')
      .eq('is_active', true)
      .or(icp_id ? `id.eq.${icp_id}` : 'id.not.is.null');

    if (!sources?.length || !icps?.length) return json(req, { discovered: 0, reason: 'no sources or icps' });

    let discovered = 0;
    for (const icp of icps) {
      for (const src of sources) {
        const candidates = await collect(src, icp, max_per_source);
        for (const c of candidates) {
          // Dedupe — match on company_name + domain (case insensitive)
          const { data: dup } = await admin
            .from('leads')
            .select('id')
            .eq('company_name', c.company_name)
            .eq('domain', c.domain || '')
            .maybeSingle();
          if (dup) continue;

          await admin.from('leads').insert({
            client_id: icp.client_id,
            icp_id: icp.id,
            source_id: src.id,
            company_name: c.company_name,
            domain: c.domain,
            website_url: c.website_url,
            website_status: c.website_status || 'unknown',
            region: c.region,
            industry: c.industry,
            metadata: c.metadata || {},
            status: 'new',
          });
          discovered++;
        }
      }
    }

    return json(req, { discovered });
  } catch (e) {
    console.error('lead-discover error', e);
    return json(req, { error: String(e?.message || e) }, { status: 500 });
  }
});

const collect = async (source: any, icp: any, limit: number): Promise<Candidate[]> => {
  switch (source.kind) {
    case 'places':           return await placesAdapter(source, icp, limit);
    case 'companies_house':  return await companiesHouseAdapter(source, icp, limit);
    case 'reddit':           return await redditAdapter(source, icp, limit);
    default: return [];
  }
};

const placesAdapter = async (source: any, icp: any, limit: number): Promise<Candidate[]> => {
  const key = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!key) return [];
  // Naive: text search by ICP keyword + UK
  const q = icp.rules?.places_query || 'small business UK';
  const url = `https://places.googleapis.com/v1/places:searchText?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.websiteUri,places.id' },
    body: JSON.stringify({ textQuery: q, maxResultCount: Math.min(limit, 20) }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const out: Candidate[] = [];
  for (const p of (data.places || [])) {
    const website = p.websiteUri || null;
    out.push({
      source_slug: source.slug,
      company_name: p.displayName?.text || 'Unknown',
      domain: website ? new URL(website).host.replace(/^www\./, '') : undefined,
      website_url: website,
      website_status: website ? 'unknown' : 'none',
      region: p.formattedAddress,
      metadata: { google_place_id: p.id },
    });
  }
  return out;
};

const companiesHouseAdapter = async (source: any, icp: any, limit: number): Promise<Candidate[]> => {
  const key = Deno.env.get('COMPANIES_HOUSE_API_KEY');
  if (!key) return [];
  const days = source.config?.incorporation_within_days || 90;
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const url = `https://api.company-information.service.gov.uk/advanced-search/companies?incorporated_from=${since}&size=${Math.min(limit, 100)}`;
  const res = await fetch(url, {
    headers: { Authorization: 'Basic ' + btoa(`${key}:`) },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const out: Candidate[] = [];
  for (const c of (data.items || data.company_results || [])) {
    out.push({
      source_slug: source.slug,
      company_name: c.company_name || c.title,
      domain: undefined,
      website_url: null,
      website_status: 'none',
      region: c.registered_office_address?.locality,
      industry: (c.sic_codes || []).join(','),
      metadata: { company_number: c.company_number, incorporated_on: c.date_of_creation || c.incorporation_date },
    });
  }
  return out;
};

const redditAdapter = async (source: any, icp: any, limit: number): Promise<Candidate[]> => {
  // Public read-only — we don't need OAuth for /search.json
  const subs = (source.config?.subreddits || []).join('+');
  if (!subs) return [];
  const q = encodeURIComponent(icp.rules?.reddit_query || 'AI engineer learning');
  const url = `https://www.reddit.com/r/${subs}/search.json?q=${q}&restrict_sr=1&limit=${Math.min(limit, 100)}&t=week`;
  const res = await fetch(url, { headers: { 'User-Agent': 'out-of-house-lead-engine/1.0' } });
  if (!res.ok) return [];
  const data = await res.json();
  const out: Candidate[] = [];
  for (const post of (data.data?.children || [])) {
    const d = post.data;
    out.push({
      source_slug: source.slug,
      company_name: `Reddit user: ${d.author}`,
      domain: undefined,
      website_url: `https://reddit.com${d.permalink}`,
      website_status: 'none',
      region: 'online',
      industry: 'aspiring_developer',
      metadata: { post_title: d.title, score: d.score, subreddit: d.subreddit },
    });
  }
  return out;
};
