import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SAAS_APPS } from '../data/saasApps';

const Saas = () => {
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

  return (
    <div className="saas-page">
      <section className="saas-hero fade-in">
        <div className="hero-eyebrow"><span className="hero-dot" /> SaaS &amp; AIaaS</div>
        <h1 className="hero-h1">
          Tools we built for ourselves —<br />
          <span className="accent">now you can use them too</span>.
        </h1>
        <p className="hero-lead saas-hero-lead">
          A growing range of products and APIs we use internally and open to developers, founders, and small teams.
          Each one solves a real annoyance we hit while shipping for clients. Each one comes with a free tier.
        </p>
      </section>

      <section className="saas-grid fade-in">
        {SAAS_APPS.map((app, i) => (
          <article key={app.slug} className={`saas-card saas-card-${app.status}`} style={{ '--stagger-i': i }}>
            <div className="saas-card-head">
              <span className="saas-card-flag">{app.flag}</span>
              <span className={`saas-card-status saas-card-status-${app.status}`}>{app.statusLabel}</span>
            </div>
            <h2>{app.title}</h2>
            <p className="saas-card-tagline">{app.tagline || app.summary}</p>
            {app.summary && app.tagline && <p className="saas-card-summary">{app.summary}</p>}
            <div className="saas-card-actions">
              {app.status === 'beta' || app.status === 'live' ? (
                <>
                  <Link to={`/saas/${app.slug}`}>
                    <button className="primary-btn"><span>Open {app.title}</span></button>
                  </Link>
                  <Link to={`/saas/${app.slug}#api`} className="saas-card-secondary">
                    See the API
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </Link>
                </>
              ) : (
                <Link to={`/saas/${app.slug}`} className="saas-card-secondary">
                  Get notified at launch
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="saas-philosophy fade-in">
        <div className="saas-philosophy-inner">
          <div className="eyebrow">Philosophy</div>
          <h2 className="section-title">
            Built first. <span className="accent">Sold second.</span>
          </h2>
          <p>
            Every product on this page started life as an internal tool we built to ship faster for clients.
            We open them up only once we have used them in production for months — and never as half-baked SaaS demos.
            That's why each comes with a free tier and an API a developer can read in a single page.
          </p>
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

export default Saas;
