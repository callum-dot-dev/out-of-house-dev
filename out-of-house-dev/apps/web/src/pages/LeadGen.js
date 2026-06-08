import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LEADGEN_PAGE } from '../data/leadgen';

const LeadGen = () => {
  const data = LEADGEN_PAGE;

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
    <div className="leadgen-page">
      <section className="leadgen-hero fade-in">
        <div className="leadgen-hero-inner">
          <Link to="/" className="service-back-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
          <div className="service-hero-eyebrow">
            <span>{data.hero.eyebrow}</span>
            {data.flag && <span className="service-hero-flag service-hero-flag-new">{data.flag}</span>}
          </div>
          <h1 className="service-hero-title">
            {renderAccented(data.hero.title, data.hero.accent)}
          </h1>
          <p className="service-hero-lead">{data.hero.lead}</p>
          <div className="service-hero-actions">
            <a href="https://cal.com/out-of-house.dev/lead-engine" target="_blank" rel="noopener noreferrer">
              <button className="primary-btn"><span>{data.cta.primary}</span></button>
            </a>
            <button type="button" className="secondary-btn" onClick={() => document.getElementById('leadgen-arch')?.scrollIntoView({ behavior: 'smooth' })}>
              <span>{data.cta.secondary}</span>
            </button>
          </div>
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

      <section id="leadgen-arch" className="leadgen-pipeline fade-in">
        <div className="leadgen-pipeline-head">
          <div className="eyebrow">Pipeline</div>
          <h2 className="section-title">An <span className="accent">autonomous pipeline</span> in seven stages.</h2>
          <p className="leadgen-pipeline-lead">
            Six are 100% automated. One is your only manual surface — and even that is one click. Anything we have to do twice gets automated within the month.
          </p>
        </div>
        <ol className="leadgen-pipeline-list">
          {data.pipeline.map((stage, i) => (
            <li key={stage.num} className={`leadgen-stage ${stage.automated ? 'is-auto' : 'is-manual'}`} style={{ '--stagger-i': i }}>
              <div className="leadgen-stage-meta">
                <span className="leadgen-stage-num">{stage.num}</span>
                <span className={`leadgen-stage-tag ${stage.automated ? 'is-auto' : 'is-manual'}`}>
                  {stage.automated ? 'Automated' : 'Manual (red)'}
                </span>
              </div>
              <div className="leadgen-stage-body">
                <h3>{stage.title}</h3>
                <p>{stage.body}</p>
                {!stage.automated && (
                  <p className="leadgen-stage-roadmap">
                    <strong>Roadmap to automate:</strong> rank dampening + auto-snooze rules trained on your acceptance history
                    will reduce this to a weekly summary review by Q3 2026.
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="leadgen-proof fade-in">
        <div className="leadgen-proof-inner">
          {data.proof.map((p) => (
            <div key={p.kicker} className="leadgen-proof-stat">
              <strong>{p.value}</strong>
              <span>{p.kicker}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="leadgen-pricing fade-in">
        <div className="leadgen-pricing-head">
          <div className="eyebrow">Pricing</div>
          <h2 className="section-title">Three engine sizes.</h2>
        </div>
        <div className="leadgen-pricing-grid">
          {data.pricing.map((p) => (
            <article key={p.tier} className={`leadgen-pricing-card ${p.featured ? 'is-featured' : ''}`}>
              {p.featured && <span className="leadgen-pricing-badge">Most popular</span>}
              <h3>{p.tier}</h3>
              <div className="leadgen-pricing-price">
                <strong>{p.price_label}</strong>
                <span>{p.price_suffix}</span>
              </div>
              <ul>{p.lines.map((l) => <li key={l}>{l}</li>)}</ul>
              <a href="https://cal.com/out-of-house.dev/lead-engine" target="_blank" rel="noopener noreferrer">
                <button className={p.featured ? 'primary-btn' : 'secondary-btn'}><span>Start with {p.tier}</span></button>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="leadgen-cta fade-in">
        <div className="leadgen-cta-inner">
          <h2>30 minute demo. Live pipeline. Your ICP.</h2>
          <p>We bring our engine, you bring your closed-won list. We show what it would have surfaced last month.</p>
          <a href="https://cal.com/out-of-house.dev/lead-engine" target="_blank" rel="noopener noreferrer">
            <button className="primary-btn"><span>Book a live demo</span></button>
          </a>
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

const renderAccented = (title, accent) => {
  if (!accent) return title;
  const idx = title.toLowerCase().indexOf(accent.toLowerCase());
  if (idx === -1) return title;
  const before = title.slice(0, idx);
  const match = title.slice(idx, idx + accent.length);
  const after = title.slice(idx + accent.length);
  return <>{before}<span className="accent">{match}</span>{after}</>;
};

export default LeadGen;
