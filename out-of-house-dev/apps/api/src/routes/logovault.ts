// Public LogoVault search (+ optional API key) with api_usage metering.
import type { FastifyInstance } from 'fastify';
import { attachViewer } from '../plugins/auth';
import { one, query } from '../lib/db';
import { sha256 } from '../lib/crypto';

type BrandRow = {
  id: string;
  slug: string;
  display_name: string;
  primary_domain: string | null;
  hex_primary: string | null;
  hex_secondary: string | null;
};

export default async function logovaultRoutes(app: FastifyInstance): Promise<void> {
  app.get('/logovault/search', { preHandler: attachViewer }, async (req) => {
    const qp = (req.query ?? {}) as Record<string, string>;
    const q = String(qp.q ?? '').trim();
    const domain = String(qp.domain ?? '').trim();
    const email = String(qp.email ?? '').trim();
    const format = String(qp.format ?? 'svg').toLowerCase();
    const variant = String(qp.variant ?? 'original').toLowerCase();
    const limit = Math.min(50, Number(qp.limit) || 24);

    const authz = req.headers.authorization;
    const keyVal = typeof authz === 'string' && authz.startsWith('Bearer ') ? authz.slice(7) : '';
    let apiKeyId: string | null = null;
    let userId: string | null = req.viewer?.id ?? null;
    if (keyVal) {
      const k = await one<{ id: string; user_id: string }>(
        'select id, user_id from api_keys where key_hash=$1 and revoked_at is null',
        [sha256(keyVal)],
      );
      if (k) {
        apiKeyId = k.id;
        userId = k.user_id;
      }
    }

    const queryDomain = domain || (email.includes('@') ? email.split('@')[1] : '');
    let brands: BrandRow[] = [];
    if (queryDomain) {
      brands = (
        await query<BrandRow>(
          'select id, slug, display_name, primary_domain, hex_primary, hex_secondary from logovault_brands where takedown=false and primary_domain ilike $1 limit $2',
          [queryDomain, limit],
        )
      ).rows;
    } else if (q) {
      brands = (
        await query<BrandRow>(
          'select id, slug, display_name, primary_domain, hex_primary, hex_secondary from logovault_brands where takedown=false and (display_name ilike $1 or slug ilike $1 or primary_domain ilike $1) limit $2',
          [`%${q}%`, limit],
        )
      ).rows;
    }

    const results = [];
    for (const b of brands) {
      const assets = (
        await query<{ format: string; variant: string; storage_path: string | null; external_url: string | null }>(
          'select format, variant, storage_path, external_url from logovault_assets where brand_id=$1',
          [b.id],
        )
      ).rows
        .filter((a) => (format === 'any' || a.format === format) && (variant === 'any' || a.variant === variant))
        .map((a) => ({ format: a.format, variant: a.variant, url: a.external_url ?? (a.storage_path ? `/api/v1/files/logovault/${a.storage_path}` : null) }));
      results.push({
        slug: b.slug,
        display_name: b.display_name,
        primary_domain: b.primary_domain,
        hex_primary: b.hex_primary,
        hex_secondary: b.hex_secondary,
        assets,
      });
    }

    await query(
      'insert into api_usage(api_key_id, user_id, saas_app_slug, endpoint, status_code, metadata) values ($1,$2,$3,$4,$5,$6)',
      [apiKeyId, userId, 'logovault', '/v1/logovault/search', 200, JSON.stringify({ q, domain: queryDomain, format, variant, hits: results.length })],
    );
    return { results, count: results.length };
  });
}
