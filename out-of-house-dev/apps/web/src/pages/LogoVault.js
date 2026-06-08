import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSaasAppBySlug } from '../data/saasApps';

const TABS = [
  { id: 'search', label: 'Search' },
  { id: 'api',    label: 'API' },
  { id: 'pricing',label: 'Pricing' },
];

const FORMATS = ['svg', 'png', 'jpg'];
const VARIANTS = ['original', 'black', 'white', 'transparent'];

const sampleResults = [
  { slug: 'stripe',    display_name: 'Stripe',    primary_domain: 'stripe.com',    hex_primary: '#635bff' },
  { slug: 'notion',    display_name: 'Notion',    primary_domain: 'notion.so',     hex_primary: '#000000' },
  { slug: 'supabase',  display_name: 'Supabase',  primary_domain: 'supabase.com',  hex_primary: '#3ecf8e' },
  { slug: 'anthropic', display_name: 'Anthropic', primary_domain: 'anthropic.com', hex_primary: '#d97757' },
  { slug: 'github',    display_name: 'GitHub',    primary_domain: 'github.com',    hex_primary: '#181717' },
  { slug: 'vercel',    display_name: 'Vercel',    primary_domain: 'vercel.com',    hex_primary: '#000000' },
];

const LogoVault = () => {
  const app = getSaasAppBySlug('logovault');
  const [tab, setTab] = useState('search');
  const [query, setQuery] = useState('');
  const [format, setFormat] = useState('svg');
  const [variant, setVariant] = useState('original');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(sampleResults);
  const [searchError, setSearchError] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    const els = document.querySelectorAll('.fade-in');
    const obs = new IntersectionObserver((entries, o) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          o.unobserve(e.target);
        }
      });
    }, { root: null, rootMargin: '0px', threshold: 0.1 });
    els.forEach((el) => obs.observe(el));
    return () => els.forEach((el) => obs.unobserve(el));
  }, []);

  const runSearch = useCallback(async (q) => {
    setLoading(true);
    setSearchError(null);
    try {
      const { data, error } = await supabase.functions.invoke('logo-search', {
        body: { q, format, variant, limit: 24 },
      });
      if (error) throw error;
      const hits = data?.results || [];
      setResults(hits.length > 0 ? hits : sampleResults);
    } catch (e) {
      // graceful degradation while the edge fn is being deployed
      setResults(filterSamples(q));
      setSearchError('Live API unavailable — showing the bundled sample set.');
    } finally {
      setLoading(false);
    }
  }, [format, variant]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (query.trim() === '') {
        setResults(sampleResults);
        return;
      }
      runSearch(query.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [query, runSearch]);

  const apiSnippet = useMemo(() => `// Search by name or domain
const res = await fetch('https://api.out-of-house.dev/v1/logovault/search', {
  headers: { Authorization: 'Bearer olv_xxx' },
  method: 'POST',
  body: JSON.stringify({ q: 'stripe', format: '${format}', variant: '${variant}' }),
});
const { results } = await res.json();
// results[0].assets => signed URLs for every requested format/variant`, [format, variant]);

  return (
    <div className="logovault-page">
      <section className="logovault-hero fade-in">
        <div className="logovault-hero-inner">
          <Link to="/saas" className="service-back-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            All SaaS products
          </Link>
          <div className="logovault-eyebrow">
            <span>{app?.hero?.eyebrow || 'AIaaS — LogoVault'}</span>
            <span className="logovault-status">Public beta</span>
          </div>
          <h1 className="logovault-title">
            Every company logo. <span className="accent">Every format. One API.</span>
          </h1>
          <p className="logovault-lead">
            Stop scraping Google Images at midnight. LogoVault gives you SVG, PNG, and JPG of any company logo,
            in black, white, colour, and transparent variants — searchable from a UI, scriptable from an API.
          </p>
          <div className="logovault-proof">
            <div><strong>900k+</strong><span>logos indexed</span></div>
            <div><strong>SVG / PNG / JPG</strong><span>every format</span></div>
            <div><strong>B / W / Colour</strong><span>every variant</span></div>
            <div><strong>Free</strong><span>50 lookups/day</span></div>
          </div>
        </div>
      </section>

      <section className="logovault-tabs fade-in" id="api">
        <div className="logovault-tabs-bar" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`logovault-tab ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >{t.label}</button>
          ))}
        </div>

        {tab === 'search' && (
          <div className="logovault-search">
            <div className="logovault-search-controls">
              <label className="logovault-search-input">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="search"
                  placeholder="Search a company or paste a domain — try 'stripe' or 'notion.so'"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </label>
              <div className="logovault-filter-group">
                <label>Format
                  <select value={format} onChange={(e) => setFormat(e.target.value)}>
                    {FORMATS.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </label>
                <label>Variant
                  <select value={variant} onChange={(e) => setVariant(e.target.value)}>
                    {VARIANTS.map((v) => <option key={v}>{v}</option>)}
                  </select>
                </label>
              </div>
            </div>

            {searchError && <div className="logovault-warn">{searchError}</div>}
            {loading && <div className="logovault-warn">Searching…</div>}

            <div className="logovault-result-grid">
              {results.map((r) => (
                <article key={r.slug} className="logovault-result-card">
                  <div className="logovault-result-mark" style={{ background: r.hex_primary || '#111' }}>
                    <span className="logovault-result-initial">{(r.display_name || r.slug || '?')[0]}</span>
                  </div>
                  <div className="logovault-result-meta">
                    <strong>{r.display_name || r.slug}</strong>
                    <span>{r.primary_domain}</span>
                  </div>
                  <div className="logovault-result-formats">
                    <span>SVG</span><span>PNG</span><span>JPG</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {tab === 'api' && (
          <div className="logovault-api">
            <div className="logovault-api-grid">
              <article className="logovault-api-card">
                <span className="logovault-api-method">POST</span>
                <code className="logovault-api-path">/v1/logovault/search</code>
                <p>Search by company name, domain, or email. Returns signed URLs for every format and variant.</p>
              </article>
              <article className="logovault-api-card">
                <span className="logovault-api-method">GET</span>
                <code className="logovault-api-path">/v1/logovault/brand/:slug</code>
                <p>Fetch a single brand by canonical slug. Includes aliases and AI-tagged metadata.</p>
              </article>
              <article className="logovault-api-card">
                <span className="logovault-api-method">POST</span>
                <code className="logovault-api-path">/v1/logovault/upload</code>
                <p>Upload your own brand asset to your private library. Indexed and tagged automatically.</p>
              </article>
              <article className="logovault-api-card">
                <span className="logovault-api-method">MCP</span>
                <code className="logovault-api-path">mcp.out-of-house.dev/logovault</code>
                <p>Plug LogoVault into Claude, Cursor, or any MCP-compatible AI tool as a callable function.</p>
              </article>
            </div>
            <pre className="logovault-codeblock"><code>{apiSnippet}</code></pre>
          </div>
        )}

        {tab === 'pricing' && (
          <div className="logovault-pricing">
            <div className="logovault-pricing-grid">
              {PRICING.map((p) => (
                <article key={p.tier} className={`logovault-tier ${p.featured ? 'is-featured' : ''}`}>
                  {p.featured && <span className="logovault-tier-badge">Most popular</span>}
                  <h3>{p.tier}</h3>
                  <div className="logovault-tier-price"><strong>{p.price}</strong><span>{p.suffix}</span></div>
                  <ul>{p.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                  <button className={p.featured ? 'primary-btn' : 'secondary-btn'}><span>{p.cta}</span></button>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <footer className="terms-conditions">
        <div className="terms-container">
          <Link to="/terms-and-conditions"><p className="terms-conditions-link">Terms</p></Link>
          <Link to="/privacy-policy"><p className="terms-conditions-link">Privacy</p></Link>
          <Link to="/subprocessors"><p className="terms-conditions-link">Sub-processors</p></Link>
          <p>&#123;out-of-house.dev&#125;. All rights reserved. © 2026</p>
        </div>
      </footer>
    </div>
  );
};

const PRICING = [
  {
    tier: 'Free',
    price: '£0',
    suffix: 'forever',
    bullets: ['Unlimited UI browsing', '50 API calls / day', 'SVG/PNG/JPG · all variants', 'Personal use only'],
    cta: 'Start free',
  },
  {
    tier: 'Indie',
    price: '£9',
    suffix: '/ month',
    bullets: ['5,000 API calls / month', 'Commercial use', 'Email support'],
    cta: 'Go Indie',
  },
  {
    tier: 'Studio',
    price: '£39',
    suffix: '/ month',
    featured: true,
    bullets: ['50,000 API calls / month', 'Private logo library', '5 team seats', 'Priority support'],
    cta: 'Go Studio',
  },
  {
    tier: 'Agency',
    price: '£149',
    suffix: '/ month',
    bullets: ['500,000 API calls / month', 'White-label', 'MCP server', 'Slack support'],
    cta: 'Go Agency',
  },
];

const filterSamples = (q) => {
  if (!q) return sampleResults;
  const lower = q.toLowerCase();
  return sampleResults.filter(
    (r) => r.display_name.toLowerCase().includes(lower) || (r.primary_domain || '').toLowerCase().includes(lower)
  );
};

export default LogoVault;
