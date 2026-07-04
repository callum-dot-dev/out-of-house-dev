import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { COURSES, getCourseBySlug, COHORTS_CONFIRMED, COHORT_TBD } from '../data/programmes';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthProvider';

const CourseDetail = () => {
  const { slug } = useParams();
  const course = getCourseBySlug(slug);
  const { user } = useAuth();
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState(null);

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
  }, [slug]);

  if (!course) return <Navigate to="/courses" replace />;

  const seatsLeft = course.seats - course.seats_taken;
  const filling = seatsLeft <= 5;

  const startCheckout = async () => {
    setEnrolling(true);
    setError(null);
    try {
      const data = await api.post('/checkout', {
        product_ref: `course:${course.slug}`,
        success_url: `${window.location.origin}/app?enrolled=${course.slug}`,
        cancel_url: window.location.href,
      });
      if (data?.url) window.location.href = data.url;
      else throw new Error('Checkout session did not return a URL.');
    } catch (e) {
      setError(e.message || 'Could not start checkout. Try again, or book a 1:1 call.');
    } finally {
      setEnrolling(false);
    }
  };

  const related = COURSES.filter((c) => c.slug !== course.slug && c.track === course.track).slice(0, 3);

  return (
    <div className="course-detail-page">
      <section className="course-detail-hero fade-in">
        <div className="course-detail-hero-inner">
          <Link to="/courses" className="service-back-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            All courses
          </Link>

          <div className="course-detail-hero-meta">
            <span className="course-detail-hero-track">{course.track === 'developers' ? 'For developers' : 'For business'}</span>
            <span className="course-detail-hero-duration">{course.duration_label}</span>
            {course.certificate && <span className="course-detail-hero-cert">Certificate · {course.cert_difficulty}</span>}
            {course.flag && <span className="course-detail-hero-flag">{course.flag}</span>}
          </div>

          <h1 className="course-detail-title">{course.name}</h1>
          <p className="course-detail-tagline">{course.tagline}</p>

          <div className="course-detail-stat-strip">
            <div><strong>{course.price_label}</strong><span>one-off</span></div>
            <div><strong>{course.duration_weeks}w</strong><span>duration</span></div>
            {COHORTS_CONFIRMED && (
              <>
                <div><strong>{formatDate(course.next_cohort)}</strong><span>next cohort</span></div>
                <div className={filling ? 'is-filling' : ''}>
                  <strong>{seatsLeft}</strong>
                  <span>{filling ? 'seats left — filling fast' : 'seats left'}</span>
                </div>
              </>
            )}
          </div>
          {!COHORTS_CONFIRMED && (
            <p className="course-detail-cohort-note">Next cohort: {COHORT_TBD}.</p>
          )}

          <div className="course-detail-actions">
            {user ? (
              <button type="button" className="primary-btn" onClick={startCheckout} disabled={enrolling}>
                <span>{enrolling ? 'Opening checkout…' : `Enrol now · ${course.price_label}`}</span>
              </button>
            ) : (
              <Link to={`/login?next=/courses/${course.slug}`}>
                <button className="primary-btn"><span>Sign in to enrol</span></button>
              </Link>
            )}
            <a href="https://cal.eu/out-of-house.dev/coaching" target="_blank" rel="noopener noreferrer">
              <button className="secondary-btn"><span>Talk to us first</span></button>
            </a>
          </div>
          {error && <div className="course-detail-error" role="alert">{error}</div>}
        </div>
      </section>

      <section className="course-detail-outcomes fade-in">
        <div className="course-detail-head">
          <div className="eyebrow">What you walk away with</div>
          <h2 className="section-title">Outcomes you can <span className="accent">show on a CV</span>.</h2>
        </div>
        <ul className="course-detail-outcome-list">
          {course.outcomes.map((o) => (
            <li key={o}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>{o}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="course-detail-syllabus fade-in">
        <div className="course-detail-head">
          <div className="eyebrow">Syllabus</div>
          <h2 className="section-title">Week by week.</h2>
        </div>
        <ol className="course-detail-modules">
          {course.modules.map((m) => (
            <li key={m.week} className="course-detail-module">
              <div className="course-detail-module-head">
                <span className="course-detail-module-week">Wk {String(m.week).padStart(2, '0')}</span>
                <h3>{m.title}</h3>
              </div>
              <ul>
                {m.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="course-detail-cta-band fade-in">
        <div className="course-detail-cta-band-inner">
          {COHORTS_CONFIRMED ? (
            <>
              <h2>Cohort starts {formatDate(course.next_cohort)}.</h2>
              <p>{seatsLeft} seats left. Once they go, the next intake is several weeks out.</p>
            </>
          ) : (
            <>
              <h2>Next cohort: dates announced at enrolment.</h2>
              <p>Apply and we’ll confirm within one business day.</p>
            </>
          )}
          <div className="course-detail-cta-band-actions">
            {user ? (
              <button type="button" className="primary-btn" onClick={startCheckout} disabled={enrolling}>
                <span>{enrolling ? 'Opening checkout…' : `Enrol now · ${course.price_label}`}</span>
              </button>
            ) : (
              <Link to={`/login?next=/courses/${course.slug}`}>
                <button className="primary-btn"><span>Sign in to enrol</span></button>
              </Link>
            )}
            <a href="https://cal.eu/out-of-house.dev/coaching" target="_blank" rel="noopener noreferrer">
              <button className="secondary-btn"><span>Or book a 1:1 first</span></button>
            </a>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="service-crosslinks fade-in">
          <div className="service-crosslinks-head">
            <div className="eyebrow">Related courses</div>
            <h2 className="section-title">More of what we teach.</h2>
          </div>
          <div className="service-crosslinks-grid">
            {related.map((r, i) => (
              <Link key={r.slug} to={`/courses/${r.slug}`} className="service-crosslink-card" style={{ '--stagger-i': i }}>
                <span className="service-crosslink-flag">{r.duration_label}</span>
                <h3>{r.name}</h3>
                <p>{r.tagline}</p>
                <span className="service-crosslink-arrow">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

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

export default CourseDetail;
