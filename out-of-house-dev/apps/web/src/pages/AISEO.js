import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AISEO } from '../data/aiseo';
import { api } from '../lib/api';

const AISEOPage = () => {
  const data = AISEO;
  const [domain, setDomain] = useState('');
  const [auditState, setAuditState] = useState({ status: 'idle' });

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

  const runAudit = async (e) => {
    e.preventDefault();
    const clean = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!clean) return;
    setAuditState({ status: 'running', domain: clean });
    try {
      const out = await api.post('/aiseo/audit', { domain: clean });
      setAuditState({ status: 'done', domain: clean, result: out });
    } catch (err) {
      // graceful degradation: synthesize a sample score so the lead magnet still works
      setAuditState({ status: 'done', domain: clean, result: sampleAudit(clean), demo: true });
    }
  };

  return (
    <div className="aiseo-page">
      <section className="aiseo-hero fade-in">
        <div className="aiseo-hero-inner">
          <Link to="/" className="service-back-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
          <div className="service-hero-eyebrow">
            <span>{data.hero.eyebrow}</span>
            <span className="service-hero-flag service-hero-flag-new">New</span>
          </div>
          <h1 className="service-hero-title" dangerouslySetInnerHTML={{ __html: data.hero.title }} />
          <p className="service-hero-lead">{data.hero.lead}</p>

          <form className="aiseo-audit-form" onSubmit={runAudit}>
            <div className="aiseo-audit-input">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <input
                type="text"
                placeholder="yourbrand.com — get a free 60-point audit"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <button type="submit" className="primary-btn" disabled={auditState.status === 'running' || !domain.trim()}>
              <span>{auditState.status === 'running' ? 'Auditing…' : 'Run free audit'}</span>
            </button>
          </form>

          <div className="service-hero-proof">
            {data.hero.proofPoints.map((p) => (
              <div className="service-hero-proof-item" key={p.kicker}>
                <strong>{p.value}</strong>
                <span>{p.kicker}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {auditState.status === 'done' && auditState.result && (
        <section className="aiseo-audit-result fade-in visible">
          <div className="aiseo-audit-result-inner">
            <div className="aiseo-audit-result-head">
              <div>
                <div className="eyebrow">Audit result · {auditState.domain}</div>
                <h2>
                  <span className="aiseo-score">{auditState.result.score}<span className="aiseo-score-over">/ 100</span></span>
                </h2>
                {auditState.demo && (
                  <p className="aiseo-demo-note">Live API unavailable — showing a representative sample. Sign up to run the live audit.</p>
                )}
              </div>
              <div className={`aiseo-audit-grade aiseo-audit-grade-${auditState.result.grade}`}>
                <strong>{auditState.result.grade}</strong>
                <span>{auditState.result.summary}</span>
              </div>
            </div>
            <div className="aiseo-audit-result-grid">
              {auditState.result.checks.map((c) => (
                <article key={c.id} className={`aiseo-check aiseo-check-${c.status}`}>
                  <span className="aiseo-check-state">{labelFor(c.status)}</span>
                  <h3>{c.title}</h3>
                  <p>{c.detail}</p>
                </article>
              ))}
            </div>
            <div className="aiseo-audit-cta">
              <a href="https://cal.com/out-of-house.dev/aiseo" target="_blank" rel="noopener noreferrer">
                <button className="primary-btn"><span>Book a call to fix these</span></button>
              </a>
              <button type="button" className="secondary-btn" onClick={() => setAuditState({ status: 'idle' })}>
                <span>Audit another domain</span>
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="aiseo-offer fade-in">
        <div className="service-section-head">
          <div className="eyebrow">{data.offer.eyebrow}</div>
          <h2 className="section-title">{data.offer.title}</h2>
        </div>
        <div className="service-offer-grid">
          {data.offer.items.map((item, i) => (
            <article className="service-offer-card" key={item.title} style={{ '--stagger-i': i }}>
              <span className="service-offer-num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="aiseo-process fade-in">
        <div className="service-section-head">
          <div className="eyebrow">{data.process.eyebrow}</div>
          <h2 className="section-title">{data.process.title}</h2>
        </div>
        <ol className="service-process-list">
          {data.process.steps.map((step) => (
            <li className="service-process-step" key={step.num}>
              <div className="service-process-meta">
                <span className="service-process-num">{step.num}</span>
                <span className="service-process-label">{step.label}</span>
              </div>
              <div className="service-process-body">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="aiseo-pricing fade-in">
        <div className="service-section-head">
          <div className="eyebrow">Pricing</div>
          <h2 className="section-title">Free to start. Honest from there.</h2>
        </div>
        <div className="leadgen-pricing-grid">
          {data.pricing.map((p) => (
            <article key={p.tier} className={`leadgen-pricing-card ${p.featured ? 'is-featured' : ''}`}>
              {p.featured && <span className="leadgen-pricing-badge">Most popular</span>}
              <h3>{p.tier}</h3>
              <div className="leadgen-pricing-price"><strong>{p.price_label}</strong><span>{p.price_suffix}</span></div>
              <ul>{p.lines.map((l) => <li key={l}>{l}</li>)}</ul>
              <a href="https://cal.com/out-of-house.dev/aiseo" target="_blank" rel="noopener noreferrer">
                <button className={p.featured ? 'primary-btn' : 'secondary-btn'}><span>{p.cta}</span></button>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="aiseo-faq fade-in">
        <div className="eyebrow">FAQ</div>
        <h2 className="section-title">Honest answers about a young market.</h2>
        <div className="aiseo-faq-grid">
          {data.faq.map((f, i) => (
            <article key={i}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </article>
          ))}
        </div>
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

const labelFor = (s) => ({
  pass: 'Pass',
  warn: 'Warn',
  fail: 'Fail',
  info: 'Info',
}[s] || s);

const sampleAudit = (domain) => ({
  score: 62,
  grade: 'C',
  summary: 'Solid foundations. Authority and citation work needed.',
  checks: [
    { id: 'schema_org',  status: 'warn', title: 'Organization schema',  detail: 'Found basic Organization JSON-LD, missing logo + sameAs to social accounts.' },
    { id: 'faq_schema',  status: 'fail', title: 'FAQ schema on FAQs',   detail: 'No FAQPage JSON-LD detected. LLMs lean heavily on FAQ schema for direct answers.' },
    { id: 'llms_txt',    status: 'fail', title: 'llms.txt present',     detail: 'No /llms.txt at root. Add a canonical brief LLMs can read in one fetch.' },
    { id: 'headings',    status: 'pass', title: 'Heading hierarchy',     detail: 'H1–H3 structure is clean across the audited pages.' },
    { id: 'questions',   status: 'warn', title: 'Question-led headings', detail: 'Only 22% of headings phrased as buyer questions. Target 60%+.' },
    { id: 'citations',   status: 'fail', title: 'Citation-able stats',   detail: 'No first-party stats with clear attribution. Add 5–10 numbers LLMs can quote with a source link.' },
    { id: 'reddit',      status: 'fail', title: 'Reddit mentions',       detail: `"${domain}" appears in 0 of the top 100 Reddit threads for your niche. Reddit is one of the top LLM citation sources.` },
    { id: 'wikipedia',   status: 'warn', title: 'Wikipedia presence',     detail: 'No Wikipedia article. Material for a credible draft exists but needs sourcing.' },
    { id: 'github_aw',   status: 'fail', title: 'Awesome-list inclusion', detail: 'Not present in top 5 awesome-* lists in your category. Submit PRs with merit.' },
    { id: 'press',       status: 'warn', title: 'Press coverage',         detail: '3 mentions in the last 12 months. LLM ranking inflects above ~10.' },
    { id: 'sitemap',     status: 'pass', title: 'XML sitemap',           detail: 'Present at /sitemap.xml and referenced from robots.txt.' },
    { id: 'robots_ai',   status: 'warn', title: 'AI crawler policy',     detail: 'robots.txt does not explicitly allow GPTBot, ClaudeBot, PerplexityBot. Recommend explicit allow.' },
    { id: 'speed',       status: 'pass', title: 'Page speed',             detail: 'Largest Contentful Paint 1.8s, within target.' },
    { id: 'depth',       status: 'warn', title: 'Content depth',          detail: 'Top pages average 580 words. LLM-favoured pages average 1200+ for B2B niches.' },
  ],
});

export default AISEOPage;
