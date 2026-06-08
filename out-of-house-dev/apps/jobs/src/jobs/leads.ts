// Lead pipeline: discover -> enrich -> score. Ported from the supabase
// lead-discover/lead-enrich/lead-score edge functions. External adapters and
// the LLM degrade to no-op / heuristic when their keys are absent.
import { z } from 'zod';
import { defineJob } from '../defineJob';
import { one, query } from '../lib/db';
import { maybeLlm } from '../lib/llm';

type Candidate = {
  source_slug: string;
  company_name: string;
  domain?: string;
  website_url?: string | null;
  website_status?: string;
  region?: string;
  industry?: string;
  metadata?: Record<string, unknown>;
};

type SourceRow = { id: string; slug: string; kind: string; config: Record<string, unknown> | null };
type IcpRow = { id: string; client_id: string | null; rules: Record<string, unknown> | null };

async function placesAdapter(src: SourceRow, icp: IcpRow, limit: number): Promise<Candidate[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return [];
  const q = (icp.rules?.places_query as string) || 'small business UK';
  const res = await fetch(`https://places.googleapis.com/v1/places:searchText?key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.websiteUri,places.id' },
    body: JSON.stringify({ textQuery: q, maxResultCount: Math.min(limit, 20) }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { places?: Array<{ displayName?: { text?: string }; formattedAddress?: string; websiteUri?: string; id?: string }> };
  return (data.places ?? []).map((p) => {
    const website = p.websiteUri ?? null;
    return {
      source_slug: src.slug,
      company_name: p.displayName?.text ?? 'Unknown',
      domain: website ? new URL(website).host.replace(/^www\./, '') : undefined,
      website_url: website,
      website_status: website ? 'unknown' : 'none',
      region: p.formattedAddress,
      metadata: { google_place_id: p.id },
    };
  });
}

async function companiesHouseAdapter(src: SourceRow, _icp: IcpRow, limit: number): Promise<Candidate[]> {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) return [];
  const days = Number(src.config?.incorporation_within_days ?? 90);
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const res = await fetch(`https://api.company-information.service.gov.uk/advanced-search/companies?incorporated_from=${since}&size=${Math.min(limit, 100)}`, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${key}:`).toString('base64') },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: Array<Record<string, unknown>> };
  return (data.items ?? []).map((c) => ({
    source_slug: src.slug,
    company_name: String(c.company_name ?? c.title ?? 'Unknown'),
    website_url: null,
    website_status: 'none',
    region: (c.registered_office_address as { locality?: string } | undefined)?.locality,
    industry: ((c.sic_codes as string[]) ?? []).join(','),
    metadata: { company_number: c.company_number, incorporated_on: c.date_of_creation },
  }));
}

async function redditAdapter(src: SourceRow, icp: IcpRow, limit: number): Promise<Candidate[]> {
  const subs = ((src.config?.subreddits as string[]) ?? []).join('+');
  if (!subs) return [];
  const q = encodeURIComponent((icp.rules?.reddit_query as string) || 'AI engineer learning');
  const res = await fetch(`https://www.reddit.com/r/${subs}/search.json?q=${q}&restrict_sr=1&limit=${Math.min(limit, 100)}&t=week`, {
    headers: { 'User-Agent': process.env.REDDIT_USER_AGENT ?? 'out-of-house-lead-engine/1.0' },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { data?: { children?: Array<{ data: Record<string, unknown> }> } };
  return (data.data?.children ?? []).map((post) => {
    const d = post.data;
    return {
      source_slug: src.slug,
      company_name: `Reddit user: ${String(d.author)}`,
      website_url: `https://reddit.com${String(d.permalink)}`,
      website_status: 'none',
      region: 'online',
      industry: 'aspiring_developer',
      metadata: { post_title: d.title, score: d.score, subreddit: d.subreddit },
    };
  });
}

async function collect(src: SourceRow, icp: IcpRow, limit: number): Promise<Candidate[]> {
  switch (src.kind) {
    case 'places':
      return placesAdapter(src, icp, limit);
    case 'companies_house':
      return companiesHouseAdapter(src, icp, limit);
    case 'reddit':
      return redditAdapter(src, icp, limit);
    default:
      return [];
  }
}

export const leadsDiscover = defineJob(
  'leads.discover',
  z.object({ icp_id: z.string().uuid().optional(), max_per_source: z.number().optional() }),
  async (data) => {
    const sources = (await query<SourceRow>('select id, slug, kind, config from lead_sources where enabled=true')).rows;
    const icps = (
      await query<IcpRow>(
        data.icp_id ? 'select id, client_id, rules from lead_icps where is_active=true and id=$1' : 'select id, client_id, rules from lead_icps where is_active=true',
        data.icp_id ? [data.icp_id] : [],
      )
    ).rows;
    if (!sources.length || !icps.length) return { discovered: 0 };

    let discovered = 0;
    for (const icp of icps) {
      for (const src of sources) {
        const candidates = await collect(src, icp, data.max_per_source ?? 100);
        for (const c of candidates) {
          const dup = await one("select id from leads where company_name=$1 and coalesce(domain,'')=$2", [c.company_name, c.domain ?? '']);
          if (dup) continue;
          await one(
            "insert into leads(client_id, icp_id, source_id, company_name, domain, website_url, website_status, region, industry, metadata, status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'new') returning id",
            [icp.client_id, icp.id, src.id, c.company_name, c.domain ?? null, c.website_url ?? null, c.website_status ?? 'unknown', c.region ?? null, c.industry ?? null, JSON.stringify(c.metadata ?? {})],
          );
          discovered++;
        }
      }
    }
    return { discovered };
  },
);

export const leadsEnrich = defineJob('leads.enrich', z.object({ batch_size: z.number().optional() }), async (data) => {
  const leads = (await query<{ id: string; website_url: string | null }>("select id, website_url from leads where status='new' limit $1", [data.batch_size ?? 50])).rows;
  let processed = 0;
  for (const lead of leads) {
    const enrichment: Record<string, unknown> = {};
    let websiteStatus = lead.website_url ? 'unknown' : 'none';
    if (lead.website_url) {
      try {
        const ctrl = new AbortController();
        const tm = setTimeout(() => ctrl.abort(), 5000);
        const resp = await fetch(lead.website_url, { redirect: 'follow', signal: ctrl.signal });
        clearTimeout(tm);
        const html = (await resp.text()).slice(0, 200_000);
        enrichment.http_status = resp.status;
        enrichment.title = (html.match(/<title>([^<]+)<\/title>/i) ?? [])[1];
        if (!resp.ok) websiteStatus = 'broken';
        else if (/wix\.com/i.test(html)) websiteStatus = 'wix';
        else if (/squarespace/i.test(html)) websiteStatus = 'squarespace';
        else if (/wp-content|wordpress/i.test(html)) websiteStatus = 'wordpress';
        else websiteStatus = 'custom';
      } catch {
        websiteStatus = 'broken';
        enrichment.error = 'fetch_failed';
      }
    }
    await one("update leads set website_status=$2, enrichment=$3, status='enriched', enriched_at=now() where id=$1 returning id", [lead.id, websiteStatus, JSON.stringify(enrichment)]);
    if (websiteStatus === 'none' || websiteStatus === 'broken') {
      await one("insert into lead_signals(lead_id, kind, detail, weight) values ($1,'no_website',$2,5.0) returning id", [lead.id, websiteStatus === 'broken' ? 'website unreachable' : 'no website discovered']);
    }
    processed++;
  }
  return { processed };
});

const SCORE_SYSTEM =
  'You are a sales analyst at a UK software studio. Given an ICP description and a candidate company, score 1-10 (10 = perfect) and write a one-sentence reason. Be strict — 7+ should be uncommon. Return strict JSON: { "score": number, "reason": string }.';

export const leadsScore = defineJob(
  'leads.score',
  z.object({ batch_size: z.number().optional(), accept_threshold: z.number().optional() }),
  async (data) => {
    const leads = (
      await query<{ id: string; company_name: string; domain: string | null; website_status: string | null; industry: string | null; enrichment: unknown; icp_prompt: string | null }>(
        "select l.id, l.company_name, l.domain, l.website_status, l.industry, l.enrichment, i.prompt as icp_prompt from leads l left join lead_icps i on i.id=l.icp_id where l.status='enriched' limit $1",
        [data.batch_size ?? 50],
      )
    ).rows;
    const threshold = data.accept_threshold ?? 6;
    let scored = 0;
    for (const lead of leads) {
      const userPrompt =
        `ICP:\n${lead.icp_prompt ?? 'Small UK business that could benefit from a same-day website or a custom AI automation.'}\n\n` +
        `Candidate:\n- Name: ${lead.company_name}\n- Domain: ${lead.domain ?? '(none)'}\n- Website status: ${lead.website_status}\n- Industry: ${lead.industry ?? '(unknown)'}\n- Enrichment: ${JSON.stringify(lead.enrichment ?? {}).slice(0, 1500)}\n`;
      const res = await maybeLlm({ purpose: 'score', model: 'claude-haiku-4-5-20251001', system: SCORE_SYSTEM, user: userPrompt, max_tokens: 200, response_format: 'json', ref: { kind: 'lead', id: lead.id } });
      let score: number;
      let reason: string;
      if (res?.json) {
        const p = res.json as { score?: number; reason?: string };
        score = typeof p.score === 'number' ? p.score : Number(p.score) || 0;
        reason = p.reason ?? res.text.slice(0, 300);
      } else {
        score = lead.website_status === 'none' || lead.website_status === 'broken' ? 7 : 4;
        reason = `Heuristic (no LLM configured): website ${lead.website_status}`;
      }
      const status = score >= threshold ? 'accepted' : 'rejected';
      await one('update leads set llm_score=$2, llm_reason=$3, scored_at=now(), status=$4 where id=$1 returning id', [lead.id, score, reason, status]);
      scored++;
    }
    return { scored };
  },
);
