// AISEO 14-axis audit — ported verbatim from supabase/functions/aiseo-audit.
// Deterministic signals (fetch + parse), no LLM. SSRF-guarded via safeFetch.
import { safeFetch } from '../lib/safeFetch';
import { query } from '../lib/db';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'info';
export type Check = { id: string; status: CheckStatus; title: string; detail: string; weight: number };
export type AuditResult = { score: number; grade: string; summary: string; checks: Check[]; domain: string };

const stripHtml = (s: string): string =>
  s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

async function tryText(url: string): Promise<{ ok: boolean; status: number; text: string }> {
  try {
    const r = await safeFetch(url);
    return { ok: r.ok, status: r.status, text: await r.text() };
  } catch {
    return { ok: false, status: 0, text: '' };
  }
}

export async function runAiseoAudit(rawDomain: string, userId?: string | null): Promise<AuditResult> {
  const hasProto = /^https?:\/\//i.test(rawDomain);
  const root = hasProto ? rawDomain.replace(/\/$/, '') : `https://${rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  const domain = root.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const checks: Check[] = [];

  // 1. root HTML
  const rootRes = await tryText(root);
  const rootHtml = rootRes.text.slice(0, 600_000);
  checks.push(
    rootRes.status >= 200 && rootRes.status < 400
      ? { id: 'reachable', status: 'pass', title: 'Site reachable', detail: `Root returns ${rootRes.status}.`, weight: 5 }
      : { id: 'reachable', status: 'fail', title: 'Site reachable', detail: `Root fetch failed (${rootRes.status}).`, weight: 5 },
  );

  // 2. Organization JSON-LD
  const hasOrg = /"@type"\s*:\s*"Organization"/i.test(rootHtml);
  const hasLogo = /"logo"\s*:/.test(rootHtml);
  const hasSameAs = /"sameAs"\s*:/.test(rootHtml);
  checks.push({
    id: 'org_schema',
    status: hasOrg ? (hasLogo && hasSameAs ? 'pass' : 'warn') : 'fail',
    title: 'Organization schema',
    detail: hasOrg ? 'Organization JSON-LD found.' : 'No Organization JSON-LD detected on the root page. Add it.',
    weight: 8,
  });

  // 3. FAQ schema
  const hasFaq = /"@type"\s*:\s*"FAQPage"/i.test(rootHtml);
  checks.push({
    id: 'faq_schema',
    status: hasFaq ? 'pass' : 'fail',
    title: 'FAQ schema',
    detail: hasFaq ? 'FAQPage JSON-LD detected.' : 'No FAQPage JSON-LD. LLMs lean on FAQ schema for direct-answer extraction.',
    weight: 7,
  });

  // 4. llms.txt
  const llms = await tryText(`${root}/llms.txt`);
  const llmsOk = llms.ok && llms.text.length > 32;
  checks.push({
    id: 'llms_txt',
    status: llmsOk ? 'pass' : 'fail',
    title: 'llms.txt present',
    detail: llmsOk ? 'Found a non-trivial /llms.txt — good.' : 'No /llms.txt at root. Add a canonical brief LLMs can fetch in one round-trip.',
    weight: 6,
  });

  // 5. robots.txt AI policy
  const robots = (await tryText(`${root}/robots.txt`)).text;
  const allowedBots = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Bingbot'];
  const disallowed = allowedBots.filter((b) => new RegExp(`User-agent:\\s*${b}[\\s\\S]*?Disallow:\\s*/`, 'i').test(robots));
  checks.push({
    id: 'robots_ai',
    status: disallowed.length === 0 ? (robots.length > 0 ? 'pass' : 'warn') : 'fail',
    title: 'AI crawler policy',
    detail:
      disallowed.length > 0
        ? `robots.txt disallows: ${disallowed.join(', ')}.`
        : robots.length > 0
          ? 'robots.txt present and does not block known AI crawlers.'
          : 'No robots.txt — add one with explicit allow lines.',
    weight: 5,
  });

  // 6. sitemap
  const sitemap = (await tryText(`${root}/sitemap.xml`)).ok;
  checks.push({
    id: 'sitemap',
    status: sitemap ? 'pass' : 'warn',
    title: 'XML sitemap',
    detail: sitemap ? 'Sitemap at /sitemap.xml.' : 'No sitemap.xml found.',
    weight: 3,
  });

  // 7. title + meta description
  const titleMatch = rootHtml.match(/<title>([^<]+)<\/title>/i);
  const descMatch = rootHtml.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  checks.push({
    id: 'title_desc',
    status: titleMatch && descMatch ? 'pass' : 'warn',
    title: 'Title + meta description',
    detail: titleMatch && descMatch ? 'Both present.' : 'Missing title or meta description on the root page.',
    weight: 3,
  });

  // 8. headings
  const h1 = (rootHtml.match(/<h1[\s>]/gi) || []).length;
  const h2 = (rootHtml.match(/<h2[\s>]/gi) || []).length;
  const h3 = (rootHtml.match(/<h3[\s>]/gi) || []).length;
  checks.push({
    id: 'headings',
    status: h1 === 1 && h2 >= 2 ? 'pass' : 'warn',
    title: 'Heading hierarchy',
    detail: `H1: ${h1}, H2: ${h2}, H3: ${h3}. Aim for exactly one H1 and a healthy H2/H3 tree.`,
    weight: 3,
  });

  // 9. OG + Twitter
  const og = /property=["']og:title["']/i.test(rootHtml);
  const tw = /name=["']twitter:card["']/i.test(rootHtml);
  checks.push({
    id: 'social_meta',
    status: og && tw ? 'pass' : 'warn',
    title: 'Open Graph + Twitter cards',
    detail: og && tw ? 'Both present.' : 'Missing OG/Twitter meta tags.',
    weight: 2,
  });

  // 10. content depth
  const textLen = stripHtml(rootHtml).split(/\s+/).filter(Boolean).length;
  checks.push({
    id: 'depth',
    status: textLen >= 800 ? 'pass' : textLen >= 300 ? 'warn' : 'fail',
    title: 'Content depth',
    detail: `Root page has ${textLen} words. LLM-favoured pages average 1200+ for B2B niches.`,
    weight: 4,
  });

  // 11. Person schema
  const hasPerson = /"@type"\s*:\s*"Person"/i.test(rootHtml);
  checks.push({
    id: 'person_schema',
    status: hasPerson ? 'pass' : 'warn',
    title: 'Author / Person schema',
    detail: hasPerson ? 'Person/author schema present.' : 'No Person schema. Named authors with credentials boost E-E-A-T signals.',
    weight: 3,
  });

  // 12. Product/Service schema
  const hasProduct = /"@type"\s*:\s*"Product"/i.test(rootHtml) || /"@type"\s*:\s*"Service"/i.test(rootHtml);
  checks.push({
    id: 'product_schema',
    status: hasProduct ? 'pass' : 'warn',
    title: 'Product / Service schema',
    detail: hasProduct ? 'Product or Service schema detected.' : 'No Product/Service schema.',
    weight: 4,
  });

  // 13. canonical
  const hasCanonical = /rel=["']canonical["']/i.test(rootHtml);
  checks.push({
    id: 'canonical',
    status: hasCanonical ? 'pass' : 'warn',
    title: 'Canonical URL',
    detail: hasCanonical ? 'Canonical link present.' : 'No <link rel="canonical">.',
    weight: 2,
  });

  // 14. HTTPS
  const isHttps = root.startsWith('https://');
  checks.push({
    id: 'https',
    status: isHttps ? 'pass' : 'fail',
    title: 'HTTPS',
    detail: isHttps ? 'HTTPS in use.' : 'No HTTPS. Required for any modern crawler trust.',
    weight: 3,
  });

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + c.weight * (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0);
  const score = Math.round((earned / totalWeight) * 100);
  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
  const summary =
    grade === 'A'
      ? 'AI-ready. Focus on authority + citations.'
      : grade === 'B'
        ? 'Solid foundations. Tighten schema + content depth.'
        : grade === 'C'
          ? 'Solid foundations. Authority and citation work needed.'
          : grade === 'D'
            ? 'Critical gaps. Ship schema + llms.txt + content depth first.'
            : 'Major foundational work required before any AI search visibility is realistic.';

  const result: AuditResult = { score, grade, summary, checks, domain };
  await query('insert into aiseo_audits(domain, user_id, score, grade, result) values ($1,$2,$3,$4,$5)', [
    domain,
    userId ?? null,
    score,
    grade,
    JSON.stringify(result),
  ]);
  return result;
}
