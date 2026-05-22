// aiseo-audit
//
// Runs a 14-axis AI-SEO audit on a public domain. Each check is a deterministic
// signal (HTTP fetches, parsing) — no LLM is needed for the scoring layer so
// this remains cheap and predictable.
//
// Body: { domain: string, deep?: boolean }
// Returns: { score, grade, summary, checks: [{ id, status, title, detail }] }

import { handleOptions, json } from '../_shared/cors.ts';
import { admin } from '../_shared/supabase-admin.ts';

type CheckStatus = 'pass' | 'warn' | 'fail' | 'info';
type Check = { id: string; status: CheckStatus; title: string; detail: string; weight: number };

Deno.serve(async (req) => {
  const opts = handleOptions(req);
  if (opts) return opts;

  try {
    const { domain: raw } = await req.json();
    if (!raw) return json(req, { error: 'domain required' }, { status: 400 });
    const domain = raw.replace(/^https?:\/\//, '').replace(/\/$/, '');

    const root = `https://${domain}`;
    const checks: Check[] = [];

    // 1. root HTML fetch
    let rootHtml = '';
    let rootStatus = 0;
    try {
      const r = await fetch(root, { redirect: 'follow' });
      rootStatus = r.status;
      rootHtml = (await r.text()).slice(0, 600_000);
    } catch { rootStatus = 0; }

    if (rootStatus >= 200 && rootStatus < 400) {
      checks.push({ id: 'reachable', status: 'pass', title: 'Site reachable', detail: `Root returns ${rootStatus}.`, weight: 5 });
    } else {
      checks.push({ id: 'reachable', status: 'fail', title: 'Site reachable', detail: `Root fetch failed (${rootStatus}).`, weight: 5 });
    }

    // 2. Organization JSON-LD
    const hasOrg = /\"@type\"\s*:\s*\"Organization\"/i.test(rootHtml);
    const hasLogo = /\"logo\"\s*:/.test(rootHtml);
    const hasSameAs = /\"sameAs\"\s*:/.test(rootHtml);
    checks.push({
      id: 'org_schema',
      status: hasOrg ? (hasLogo && hasSameAs ? 'pass' : 'warn') : 'fail',
      title: 'Organization schema',
      detail: hasOrg
        ? `Organization JSON-LD found${hasLogo && hasSameAs ? ' with logo + sameAs.' : '; missing ' + (!hasLogo ? 'logo' : '') + (!hasLogo && !hasSameAs ? ' + ' : '') + (!hasSameAs ? 'sameAs' : '') + '.'}`
        : 'No Organization JSON-LD detected on the root page. Add it.',
      weight: 8,
    });

    // 3. FAQ schema anywhere
    const hasFaq = /\"@type\"\s*:\s*\"FAQPage\"/i.test(rootHtml);
    checks.push({
      id: 'faq_schema',
      status: hasFaq ? 'pass' : 'fail',
      title: 'FAQ schema',
      detail: hasFaq ? 'FAQPage JSON-LD detected.' : 'No FAQPage JSON-LD. LLMs lean heavily on FAQ schema for direct-answer extraction.',
      weight: 7,
    });

    // 4. llms.txt
    let llmsTxt = false;
    try {
      const r = await fetch(`${root}/llms.txt`);
      llmsTxt = r.ok && (await r.text()).length > 32;
    } catch { /* ignore */ }
    checks.push({
      id: 'llms_txt',
      status: llmsTxt ? 'pass' : 'fail',
      title: 'llms.txt present',
      detail: llmsTxt
        ? 'Found a non-trivial /llms.txt — good.'
        : 'No /llms.txt at root. Add a canonical brief LLMs can fetch in one round-trip.',
      weight: 6,
    });

    // 5. robots.txt AI policy
    let robots = '';
    try { robots = await (await fetch(`${root}/robots.txt`)).text(); } catch { /* */ }
    const allowedBots = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Bingbot'];
    const disallowed = allowedBots.filter((b) => new RegExp(`User-agent:\\s*${b}[\\s\\S]*?Disallow:\\s*/`, 'i').test(robots));
    checks.push({
      id: 'robots_ai',
      status: disallowed.length === 0 ? (robots.length > 0 ? 'pass' : 'warn') : 'fail',
      title: 'AI crawler policy',
      detail: disallowed.length > 0
        ? `robots.txt disallows: ${disallowed.join(', ')}. If you want LLM citations, allow these.`
        : robots.length > 0
          ? 'robots.txt present and does not block known AI crawlers.'
          : 'No robots.txt — defaults apply. Add one with explicit allow lines.',
      weight: 5,
    });

    // 6. Sitemap
    let sitemap = false;
    try { sitemap = (await fetch(`${root}/sitemap.xml`)).ok; } catch { /* */ }
    checks.push({
      id: 'sitemap',
      status: sitemap ? 'pass' : 'warn',
      title: 'XML sitemap',
      detail: sitemap ? 'Sitemap at /sitemap.xml.' : 'No sitemap.xml found — LLM crawlers and traditional search both benefit from one.',
      weight: 3,
    });

    // 7. <title> + meta description
    const titleMatch = rootHtml.match(/<title>([^<]+)<\/title>/i);
    const descMatch  = rootHtml.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    checks.push({
      id: 'title_desc',
      status: titleMatch && descMatch ? 'pass' : 'warn',
      title: 'Title + meta description',
      detail: titleMatch && descMatch
        ? `Both present. Title: "${(titleMatch[1] || '').slice(0, 70)}…"`
        : 'Missing title or meta description on the root page.',
      weight: 3,
    });

    // 8. Heading structure (count h1/h2/h3)
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

    // 9. Open Graph / Twitter cards
    const og = /property=["']og:title["']/i.test(rootHtml);
    const tw = /name=["']twitter:card["']/i.test(rootHtml);
    checks.push({
      id: 'social_meta',
      status: og && tw ? 'pass' : 'warn',
      title: 'Open Graph + Twitter cards',
      detail: og && tw ? 'Both present.' : `Missing ${[!og && 'OG', !tw && 'Twitter'].filter(Boolean).join(' + ')} meta tags.`,
      weight: 2,
    });

    // 10. Content depth (word count on root)
    const textLen = stripHtml(rootHtml).split(/\s+/).filter(Boolean).length;
    checks.push({
      id: 'depth',
      status: textLen >= 800 ? 'pass' : textLen >= 300 ? 'warn' : 'fail',
      title: 'Content depth',
      detail: `Root page has ${textLen.toLocaleString()} words. LLM-favoured pages average 1200+ for B2B niches.`,
      weight: 4,
    });

    // 11. Author / E-E-A-T schema
    const hasPerson = /\"@type\"\s*:\s*\"Person\"/i.test(rootHtml);
    checks.push({
      id: 'person_schema',
      status: hasPerson ? 'pass' : 'warn',
      title: 'Author / Person schema',
      detail: hasPerson ? 'Person/author schema present.' : 'No Person schema. Adding named authors with credentials boosts E-E-A-T-style signals LLMs use.',
      weight: 3,
    });

    // 12. Product / Service schema
    const hasProduct = /\"@type\"\s*:\s*\"Product\"/i.test(rootHtml) || /\"@type\"\s*:\s*\"Service\"/i.test(rootHtml);
    checks.push({
      id: 'product_schema',
      status: hasProduct ? 'pass' : 'warn',
      title: 'Product / Service schema',
      detail: hasProduct ? 'Product or Service schema detected.' : 'No Product/Service schema. Add it to surface offerings in AI Overviews and Perplexity cards.',
      weight: 4,
    });

    // 13. Canonical
    const hasCanonical = /rel=["']canonical["']/i.test(rootHtml);
    checks.push({
      id: 'canonical',
      status: hasCanonical ? 'pass' : 'warn',
      title: 'Canonical URL',
      detail: hasCanonical ? 'Canonical link present.' : 'No <link rel="canonical">. Add to disambiguate from staging / variants.',
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

    // Score: weighted average where pass=1, warn=0.5, fail=0
    const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
    const earned = checks.reduce((s, c) => s + c.weight * (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0);
    const score = Math.round((earned / totalWeight) * 100);
    const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';

    const result = {
      score,
      grade,
      summary: grade === 'A' ? 'AI-ready. Focus on authority + citations.'
        : grade === 'B' ? 'Solid foundations. Tighten schema + content depth.'
        : grade === 'C' ? 'Solid foundations. Authority and citation work needed.'
        : grade === 'D' ? 'Critical gaps. Ship schema + llms.txt + content depth first.'
        : 'Major foundational work required before any AI search visibility is realistic.',
      checks,
    };

    // Best-effort persistence
    admin.from('aiseo_audits').insert({
      domain,
      score,
      grade,
      result,
    }).then(() => null).catch(() => null);

    return json(req, result);
  } catch (e) {
    console.error('aiseo-audit error', e);
    return json(req, { error: String(e?.message || e) }, { status: 500 });
  }
});

const stripHtml = (s: string) =>
  s.replace(/<script[\s\S]*?<\/script>/gi, ' ')
   .replace(/<style[\s\S]*?<\/style>/gi, ' ')
   .replace(/<[^>]+>/g, ' ')
   .replace(/\s+/g, ' ');
