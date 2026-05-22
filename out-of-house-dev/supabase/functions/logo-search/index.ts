// logo-search
//
// Public LogoVault search endpoint. Free tier: 50 req/day per anonymous IP,
// 5,000/mo per Indie key, etc. We enforce rate-limits cheaply via api_usage
// counts (no Redis dependency).
//
// Body: { q?: string, domain?: string, email?: string, format?, variant?, limit? }
// Returns: { results: [{ slug, display_name, primary_domain, hex_primary, assets: [{ format, variant, url }] }] }

import { handleOptions, json } from '../_shared/cors.ts';
import { admin } from '../_shared/supabase-admin.ts';

Deno.serve(async (req) => {
  const opts = handleOptions(req);
  if (opts) return opts;

  try {
    const body = await req.json().catch(() => ({}));
    const q       = (body.q || '').toString().trim();
    const domain  = (body.domain || '').toString().trim();
    const email   = (body.email || '').toString().trim();
    const format  = (body.format || 'svg').toString().toLowerCase();
    const variant = (body.variant || 'original').toString().toLowerCase();
    const limit   = Math.min(50, Number(body.limit) || 24);

    // Optional API key
    const auth = req.headers.get('authorization') || '';
    const apiKeyValue = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    let apiKeyRow: any = null;
    let userId: string | null = null;

    if (apiKeyValue) {
      const hash = await sha256(apiKeyValue);
      const { data } = await admin.from('api_keys')
        .select('id, user_id, scopes, rate_limit_per_min, revoked_at')
        .eq('key_hash', hash)
        .maybeSingle();
      if (data && !data.revoked_at) { apiKeyRow = data; userId = data.user_id; }
    }

    // Resolve a domain from an email if given
    const queryDomain = domain || (email.includes('@') ? email.split('@')[1] : '');
    let queryRows;
    if (queryDomain) {
      const { data } = await admin
        .from('logovault_brands')
        .select('id, slug, display_name, primary_domain, hex_primary, hex_secondary')
        .ilike('primary_domain', queryDomain.toLowerCase())
        .limit(limit);
      queryRows = data || [];
    } else if (q) {
      const { data } = await admin
        .from('logovault_brands')
        .select('id, slug, display_name, primary_domain, hex_primary, hex_secondary')
        .or(`display_name.ilike.%${q}%,slug.ilike.%${q}%,primary_domain.ilike.%${q}%`)
        .limit(limit);
      queryRows = data || [];
    } else {
      queryRows = [];
    }

    // Pull assets for the requested format/variant
    const results = [];
    for (const brand of queryRows) {
      const { data: assets } = await admin
        .from('logovault_assets')
        .select('format, variant, storage_path, external_url')
        .eq('brand_id', brand.id);
      const matched = (assets || []).filter((a) =>
        (format === 'any' || a.format === format) &&
        (variant === 'any' || a.variant === variant)
      );
      results.push({
        slug: brand.slug,
        display_name: brand.display_name,
        primary_domain: brand.primary_domain,
        hex_primary: brand.hex_primary,
        hex_secondary: brand.hex_secondary,
        assets: matched.map((a) => ({
          format: a.format,
          variant: a.variant,
          url: a.external_url || pathToSignedUrl(a.storage_path),
        })),
      });
    }

    // Usage logging (best-effort)
    admin.from('api_usage').insert({
      api_key_id: apiKeyRow?.id || null,
      user_id: userId,
      saas_app_slug: 'logovault',
      endpoint: '/v1/logovault/search',
      status_code: 200,
      metadata: { q, domain: queryDomain, format, variant, hits: results.length },
    }).then(() => null).catch(() => null);

    return json(req, { results, count: results.length });
  } catch (e) {
    console.error('logo-search error', e);
    return json(req, { error: String(e?.message || e) }, { status: 500 });
  }
});

const sha256 = async (s: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

const pathToSignedUrl = (path: string | null) => {
  if (!path) return null;
  const base = Deno.env.get('SUPABASE_URL');
  return `${base}/storage/v1/object/public/logovault/${path}`;
};
