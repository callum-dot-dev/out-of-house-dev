import React, { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { COACHING_TRACKS, COURSES, getCoachingTrack, COHORTS_CONFIRMED } from '../data/programmes';

const CoachingTrack = () => {
  const { track: trackSlug } = useParams();
  const track = getCoachingTrack(trackSlug);
  const courses = COURSES.filter((c) => c.track === trackSlug);

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
  }, [trackSlug]);

  if (!track) return <Navigate to="/coaching" replace />;

  return (
    <div className="coaching-track-page">
      <section className="service-hero fade-in">
        <div className="service-hero-inner">
          <Link to="/coaching" className="service-back-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            All coaching tracks
          </Link>
          <div className="service-hero-eyebrow">
            <span>{track.hero.eyebrow}</span>
            {track.flag && <span className={`service-hero-flag service-hero-flag-${track.flag.toLowerCase()}`}>{track.flag}</span>}
          </div>
          <h1 className="service-hero-title">
            {renderAccented(track.hero.title, track.hero.accent)}
          </h1>
          <p className="service-hero-lead">{track.hero.lead}</p>
          <div className="service-hero-actions">
            <a href="https://cal.com/out-of-house.dev/coaching" target="_blank" rel="noopener noreferrer">
              <button className="primary-btn"><span>{track.cta.primary}</span></button>
            </a>
            <Link to={trackSlug === 'developers' ? '/courses?track=developers' : '/courses?track=business'}>
              <button className="secondary-btn"><span>{track.cta.secondary}</span></button>
            </Link>
          </div>
          <div className="service-hero-proof">
            {track.hero.proofPoints.map((p) => (
              <div className="service-hero-proof-item" key={p.kicker}>
                <strong>{p.value}</strong>
                <span>{p.kicker}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="service-section service-offer fade-in">
        <div className="service-section-head">
          <div className="eyebrow">{track.offer.eyebrow}</div>
          <h2 className="section-title">{track.offer.title}</h2>
        </div>
        <div className="service-offer-grid">
          {track.offer.items.map((item, i) => (
            <article className="service-offer-card" key={item.title} style={{ '--stagger-i': i }}>
              <span className="service-offer-num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="service-section service-process fade-in">
        <div className="service-section-head">
          <div className="eyebrow">{track.process.eyebrow}</div>
          <h2 className="section-title">{track.process.title}</h2>
        </div>
        <ol className="service-process-list">
          {track.process.steps.map((step) => (
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

      <section className="service-section service-deliverables fade-in">
        <div className="service-section-head">
          <div className="eyebrow">{track.deliverables.eyebrow}</div>
          <h2 className="section-title">{track.deliverables.title}</h2>
        </div>
        <ul className="service-deliverables-list">
          {track.deliverables.items.map((item) => (
            <li key={item}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {courses.length > 0 && (
        <section className="service-section coaching-courses-section fade-in">
          <div className="service-section-head">
            <div className="eyebrow">Cohort courses</div>
            <h2 className="section-title">Or join a <span className="accent">structured course</span>.</h2>
          </div>
          <div className="coaching-courses-grid">
            {courses.map((c, i) => (
              <article key={c.slug} className="coaching-course-card" style={{ '--stagger-i': i }}>
                <div className="coaching-course-head">
                  <span className="coaching-course-duration">{c.duration_label}</span>
                  {c.flag && <span className="coaching-course-flag">{c.flag}</span>}
                </div>
                <h3>{c.name}</h3>
                <p>{c.tagline}</p>
                <div className="coaching-course-meta">
                  <strong>{c.price_label}</strong>
                  <span>·</span>
                  {COHORTS_CONFIRMED ? (
                    <>
                      <span>Next cohort {formatDate(c.next_cohort)}</span>
                      <span>·</span>
                      <span>{c.seats - c.seats_taken} seats left</span>
                    </>
                  ) : (
                    <span>Cohort dates confirmed on enrolment</span>
                  )}
                </div>
                <Link to={`/courses/${c.slug}`} className="coaching-course-link">
                  Syllabus &amp; enrolment
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="service-cta fade-in">
        <div className="service-cta-inner">
          <h2>Ready to start?</h2>
          <p>Book a 1:1 session in your local timezone, or apply for the next cohort.</p>
          <div className="service-cta-actions">
            <a href="https://cal.com/out-of-house.dev/coaching" target="_blank" rel="noopener noreferrer">
              <button className="primary-btn"><span>Book a 1:1 session</span></button>
            </a>
            <Link to={trackSlug === 'developers' ? '/courses?track=developers' : '/courses?track=business'}>
              <button className="secondary-btn"><span>See courses</span></button>
            </Link>
          </div>
        </div>
      </section>

      <section className="service-crosslinks fade-in">
        <div className="service-crosslinks-head">
          <div className="eyebrow">Other tracks</div>
          <h2 className="section-title">More ways to work with us.</h2>
        </div>
        <div className="service-crosslinks-grid">
          {COACHING_TRACKS.filter((t) => t.slug !== trackSlug).map((other, i) => (
            <Link key={other.slug} to={`/coaching/${other.slug}`} className="service-crosslink-card" style={{ '--stagger-i': i }}>
              <span className="service-crosslink-flag service-crosslink-flag-new">Coaching</span>
              <h3>{other.title}</h3>
              <p>{other.navCaption}</p>
              <span className="service-crosslink-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
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

const renderAccented = (title, accent) => {
  if (!accent) return title;
  const idx = title.toLowerCase().indexOf(accent.toLowerCase());
  if (idx === -1) return title;
  const before = title.slice(0, idx);
  const match = title.slice(idx, idx + accent.length);
  const after = title.slice(idx + accent.length);
  return <>{before}<span className="accent">{match}</span>{after}</>;
};

const formatDate = (iso) => {
  if (!iso) return 'TBC';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
};

export default CoachingTrack;
