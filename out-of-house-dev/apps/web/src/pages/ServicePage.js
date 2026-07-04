import React, { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getServiceBySlug, SERVICES } from '../data/services';

const ServicePage = () => {
  const { slug } = useParams();
  const service = getServiceBySlug(slug);

  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [slug]);

  useEffect(() => {
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
  }, [slug]);

  if (!service) return <Navigate to="/" replace />;

  const others = SERVICES.filter((s) => s.slug !== service.slug);

  return (
    <div className="service-page">
      <ServiceHero service={service} />
      <PriceAnchor slug={service.slug} />
      <ServiceOffer service={service} />
      <ServiceProcess service={service} />
      <ServiceDeliverables service={service} />
      <ServiceCta service={service} />
      <ServiceCrosslinks current={service} others={others} />
      <ServiceFooter />
    </div>
  );
};

const ServiceHero = ({ service }) => (
  <section className="service-hero fade-in">
    <div className="service-hero-inner">
      <Link to="/" className="service-back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to home
      </Link>
      <div className="service-hero-eyebrow">
        <span>{service.hero.eyebrow}</span>
        {service.flag && <span className={`service-hero-flag service-hero-flag-${service.flag.toLowerCase()}`}>{service.flag}</span>}
      </div>
      <h1 className="service-hero-title">
        {renderAccented(service.hero.title, service.hero.accent)}
      </h1>
      <p className="service-hero-lead">{service.hero.lead}</p>

      <div className="service-hero-actions">
        <a href="https://cal.eu/out-of-house.dev" target="_blank" rel="noopener noreferrer">
          <button className="primary-btn"><span>{service.cta.primary}</span></button>
        </a>
        <Link to="/#pricing">
          <button className="secondary-btn"><span>{service.cta.secondary}</span></button>
        </Link>
      </div>

      <div className="service-hero-proof">
        {service.hero.proofPoints.map((p) => (
          <div className="service-hero-proof-item" key={p.kicker}>
            <strong>{p.value}</strong>
            <span>{p.kicker}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const ServiceOffer = ({ service }) => (
  <section className="service-section service-offer fade-in">
    <div className="service-section-head">
      <div className="eyebrow">{service.offer.eyebrow}</div>
      <h2 className="section-title">{service.offer.title}</h2>
    </div>
    <div className="service-offer-grid">
      {service.offer.items.map((item, i) => (
        <article className="service-offer-card" key={item.title} style={{ '--stagger-i': i }}>
          <span className="service-offer-num">{String(i + 1).padStart(2, '0')}</span>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </article>
      ))}
    </div>
  </section>
);

const ServiceProcess = ({ service }) => (
  <section className="service-section service-process fade-in">
    <div className="service-section-head">
      <div className="eyebrow">{service.process.eyebrow}</div>
      <h2 className="section-title">{service.process.title}</h2>
    </div>
    <ol className="service-process-list">
      {service.process.steps.map((step) => (
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
);

const ServiceDeliverables = ({ service }) => (
  <section className="service-section service-deliverables fade-in">
    <div className="service-section-head">
      <div className="eyebrow">{service.deliverables.eyebrow}</div>
      <h2 className="section-title">{service.deliverables.title}</h2>
    </div>
    <ul className="service-deliverables-list">
      {service.deliverables.items.map((item) => (
        <li key={item}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </section>
);

const ServiceCta = ({ service }) => (
  <section className="service-cta fade-in">
    <div className="service-cta-inner">
      <h2>Ready to scope it?</h2>
      <p>30-minute call. Real engineer on the line. Fixed-price scope within 24 hours.</p>
      <div className="service-cta-actions">
        <a href="https://cal.eu/out-of-house.dev" target="_blank" rel="noopener noreferrer">
          <button className="primary-btn"><span>{service.cta.primary}</span></button>
        </a>
        <Link to="/">
          <button className="secondary-btn"><span>Back to all services</span></button>
        </Link>
      </div>
    </div>
  </section>
);

const ServiceCrosslinks = ({ current, others }) => (
  <section className="service-crosslinks fade-in">
    <div className="service-crosslinks-head">
      <div className="eyebrow">Other services</div>
      <h2 className="section-title">More of what we ship.</h2>
    </div>
    <div className="service-crosslinks-grid">
      {others.map((s, i) => (
        <Link
          key={s.slug}
          to={`/services/${s.slug}`}
          className="service-crosslink-card"
          style={{ '--stagger-i': i }}
        >
          {s.flag && <span className={`service-crosslink-flag service-crosslink-flag-${s.flag.toLowerCase()}`}>{s.flag}</span>}
          <h3>{s.title}</h3>
          <p>{s.navCaption}</p>
          <span className="service-crosslink-arrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </span>
        </Link>
      ))}
    </div>
  </section>
);

const ServiceFooter = () => (
  <footer className="terms-conditions">
    <div className="terms-container">
      <Link to="/terms-and-conditions"><p className="terms-conditions-link">Terms</p></Link>
      <Link to="/privacy-policy"><p className="terms-conditions-link">Privacy</p></Link>
      <Link to="/subprocessors"><p className="terms-conditions-link">Sub-processors</p></Link>
      <p>&#123;out-of-house.dev&#125;. All rights reserved. © 2026</p>
    </div>
  </footer>
);

// Shared price-anchor block (services-build.md / services-growth-care.md) —
// transparent pricing directly under each service hero, verbatim from the
// content package. "Price your X" presets the homepage calculator via ?build=.
const CAL = 'https://cal.eu/out-of-house.dev';
const PRICE_ANCHORS = {
  'ai-automations': {
    body: (
      <>
        <strong>From £750</strong> fixed, per scoped automation · typical multi-workflow builds
        £1,550–£4,350 · complex, multi-system scopes quoted to ~£20k · optional care &amp; monitoring
        £150/month (model usage at cost).
      </>
    ),
    actions: [
      { label: 'Price your automation', kind: 'calc', build: 'automation', variant: 'primary' },
      { label: 'Book a scoping call', kind: 'cal', variant: 'secondary' },
    ],
  },
  websites: {
    body: (
      <>
        <strong>£500</strong> for a starter site — up to 5 pages, live same day · +£150/page beyond 5 ·{' '}
        <strong>£100/month</strong> hosting and care (updates, backups, uptime) · cancel anytime, the
        site stays yours.
      </>
    ),
    actions: [
      { label: 'Price your site', kind: 'calc', build: 'website', variant: 'primary' },
      { label: 'Brief us today', kind: 'cal', variant: 'secondary' },
    ],
  },
  'web-apps': {
    body: (
      <>
        <strong>From £4,000</strong> for an MVP · typical 5-feature build with auth and an AI feature
        ≈ £7,900 · care &amp; monitoring £300/month · larger products quoted fixed, within 24 hours of
        a call.
      </>
    ),
    actions: [
      { label: 'Price your build', kind: 'calc', build: 'webapp', variant: 'primary' },
      { label: 'Scope a product', kind: 'cal', variant: 'secondary' },
    ],
  },
  'internal-tools': {
    body: (
      <>
        <strong>From £3,500</strong> fixed · typical 4-module tool with accounts ≈ £6,800 · care &amp;
        monitoring £400/month · systems beyond ~10 modules quoted to ~£50k.
      </>
    ),
    actions: [
      { label: 'Price your tool', kind: 'calc', build: 'custom', variant: 'primary' },
      { label: 'Audit your workflow', kind: 'cal', variant: 'secondary' },
    ],
  },
  'ai-growth': {
    body: (
      <>
        Two ways in. <strong>Productised:</strong> the managed <Link to="/lead-engine">Lead Engine</Link>{' '}
        — tiers from <strong>£500 setup + £250/month</strong>, running within a week.{' '}
        <strong>Bespoke:</strong> a custom growth build on your exact stack and data — scoped on a call,
        fixed quote within 24 hours.
      </>
    ),
    note: (
      <>
        If the tiers fit, take the tiers — the bespoke route is for teams with unusual data sources,
        compliance constraints, or an existing sales stack we need to build around.
      </>
    ),
    actions: [
      { label: 'See Lead Engine tiers', kind: 'link', to: '/lead-engine', variant: 'primary' },
      { label: 'Book a growth call', kind: 'cal', variant: 'secondary' },
    ],
  },
  maintenance: {
    body: (
      <>
        <strong>Care from £100/month</strong> — we keep it running: hosting, updates, backups,
        monitoring, small fixes. <strong>Retainers from £1,500/month</strong> — we keep it shipping:
        features, iteration, 2–3 day cycles. First month of any retainer: money back if it&apos;s not
        working.
      </>
    ),
    actions: [
      { label: 'See pricing', kind: 'link', to: '/#pricing', variant: 'primary' },
      { label: 'Book a call', kind: 'cal', variant: 'secondary' },
    ],
  },
};

const AnchorAction = ({ action }) => {
  const cls = `${action.variant === 'primary' ? 'primary-btn' : 'secondary-btn'}`;
  if (action.kind === 'cal') {
    return (
      <a href={CAL} target="_blank" rel="noopener noreferrer">
        <button type="button" className={cls}><span>{action.label}</span></button>
      </a>
    );
  }
  const to = action.kind === 'calc' ? `/?build=${action.build}#calculator` : action.to;
  return (
    <Link to={to}>
      <button type="button" className={cls}><span>{action.label}</span></button>
    </Link>
  );
};

const PriceAnchor = ({ slug }) => {
  const anchor = PRICE_ANCHORS[slug];
  if (!anchor) return null;
  return (
    <section className="service-price-anchor fade-in" aria-label="Pricing">
      <div className="service-hero-inner">
        <div className="price-anchor">
          <p className="price-anchor-body">{anchor.body}</p>
          {anchor.note && <p className="price-anchor-note">{anchor.note}</p>}
          <div className="price-anchor-actions">
            {anchor.actions.map((a) => <AnchorAction key={a.label} action={a} />)}
          </div>
        </div>
      </div>
    </section>
  );
};

const renderAccented = (title, accent) => {
  if (!accent) return title;
  const idx = title.toLowerCase().indexOf(accent.toLowerCase());
  if (idx === -1) return title;
  const before = title.slice(0, idx);
  const match = title.slice(idx, idx + accent.length);
  const after = title.slice(idx + accent.length);
  return (
    <>
      {before}
      <span className="accent">{match}</span>
      {after}
    </>
  );
};

export default ServicePage;
