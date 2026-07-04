import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { COURSES, COHORTS_CONFIRMED, COHORT_TBD } from '../data/programmes';

const FILTERS = [
  { value: 'all',        label: 'All' },
  { value: 'developers', label: 'For developers' },
  { value: 'business',   label: 'For business' },
];

const Courses = () => {
  const [params, setParams] = useSearchParams();
  const initial = params.get('track') || 'all';
  const [filter, setFilter] = useState(initial);

  useEffect(() => { setFilter(params.get('track') || 'all'); }, [params]);

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

  const list = useMemo(() => {
    if (filter === 'all') return COURSES;
    return COURSES.filter((c) => c.track === filter);
  }, [filter]);

  const setTrack = (value) => {
    setFilter(value);
    if (value === 'all') params.delete('track'); else params.set('track', value);
    setParams(params, { replace: true });
  };

  return (
    <div className="courses-page">
      <section className="courses-hero fade-in">
        <div className="hero-eyebrow"><span className="hero-dot" /> Cohort courses</div>
        <h1 className="hero-h1">
          Small cohorts, real projects,<br />
          <span className="accent">verifiable certificates.</span>
        </h1>
        <p className="hero-lead courses-hero-lead">
          3, 6, and 12-week courses for developers (£395 / £795 / £1,495) and business teams
          (£1,500 / £3,500 / £6,500). Live sessions, async review, and a capstone you ship for real.
          Developer certificates are publicly verifiable at out-of-house.dev/verify.
        </p>
        <div className="courses-filter" role="tablist" aria-label="Filter courses">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              className={`courses-filter-btn ${filter === f.value ? 'is-active' : ''}`}
              onClick={() => setTrack(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className="courses-grid-section fade-in">
        <div className="courses-grid">
          {list.map((c, i) => (
            <article key={c.slug} className="course-card" style={{ '--stagger-i': i }}>
              <div className="course-card-head">
                <span className="course-card-duration">{c.duration_label}</span>
                {c.flag && <span className="course-card-flag">{c.flag}</span>}
                <span className={`course-card-track course-card-track-${c.track}`}>
                  {c.track === 'developers' ? 'Developers' : 'Business'}
                </span>
              </div>
              <h2>{c.name}</h2>
              <p className="course-card-tagline">{c.tagline}</p>
              <div className="course-card-stat-row">
                <div className="course-card-stat"><strong>{c.price_label}</strong><span>one-off</span></div>
                <div className="course-card-stat"><strong>{c.duration_weeks}w</strong><span>duration</span></div>
                {COHORTS_CONFIRMED && (
                  <div className="course-card-stat"><strong>{c.seats - c.seats_taken}</strong><span>seats left</span></div>
                )}
                <div className="course-card-stat"><strong>{c.certificate ? 'Yes' : '—'}</strong><span>cert.</span></div>
              </div>
              <div className="course-card-meta">
                {COHORTS_CONFIRMED
                  ? <>Next cohort starts <strong>{formatDate(c.next_cohort)}</strong></>
                  : <>Next cohort: {COHORT_TBD}.</>}
              </div>
              <ul className="course-card-outcomes">
                {c.outcomes.slice(0, 3).map((o) => (
                  <li key={o}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
              <Link to={`/courses/${c.slug}`} className="course-card-cta">
                <button className="primary-btn"><span>Syllabus &amp; enrol</span></button>
              </Link>
            </article>
          ))}
        </div>
        {list.length === 0 && (
          <div className="courses-empty">
            <p>No courses match this filter yet — try another track.</p>
          </div>
        )}
      </section>

      <section className="courses-faq fade-in">
        <div className="eyebrow">Course FAQ</div>
        <h2 className="section-title">Quick answers.</h2>
        <div className="courses-faq-grid">
          <article>
            <h3>Is the certificate worth anything?</h3>
            <p>It is for us — top performers get a real interview for our bench, which is real paid client work. It is also publicly verifiable, so anyone you send it to can check it.</p>
          </article>
          <article>
            <h3>What if I miss a cohort session?</h3>
            <p>Every session is recorded and transcribed in your private space. The async loop in the cohort Slack keeps you moving even if you miss a live.</p>
          </article>
          <article>
            <h3>Can I get a refund?</h3>
            <p>Yes — full refund inside the first week of any cohort if it is not working for you. After that, refunds are pro-rata for genuine extenuating circumstances.</p>
          </article>
          <article>
            <h3>Do you offer payment plans?</h3>
            <p>Yes. Three monthly instalments for any 6 or 12-week course. Stripe handles the schedule, you handle the work.</p>
          </article>
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

const formatDate = (iso) => {
  if (!iso) return 'TBC';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
};

export default Courses;
