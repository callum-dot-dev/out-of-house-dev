import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { COACHING_TRACKS, COACHING_PRICING_HOURLY_GBP } from '../data/programmes';

const Coaching = () => {
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
    <div className="coaching-index">
      <section className="coaching-index-hero fade-in">
        <div className="hero-eyebrow"><span className="hero-dot" /> Coaching</div>
        <h1 className="hero-h1">
          1:1 coaching with senior engineers,<br />
          <span className="accent">£{COACHING_PRICING_HOURLY_GBP}/hour</span> — or a structured course.
        </h1>
        <p className="hero-lead coaching-index-lead">
          Two audiences. One philosophy: hands-on, project-led, with a senior who has actually shipped this stuff. Pick the track that matches you.
        </p>
        <div className="coaching-index-actions">
          <Link to="/coaching/developers"><button className="primary-btn"><span>I'm a developer</span></button></Link>
          <Link to="/coaching/business"><button className="secondary-btn"><span>I run a business</span></button></Link>
        </div>
      </section>

      <section className="coaching-tracks fade-in">
        {COACHING_TRACKS.map((track, i) => (
          <article key={track.slug} className="coaching-track-card" style={{ '--stagger-i': i }}>
            <div className="coaching-track-head">
              <span className="coaching-track-tag">{track.audience === 'developer' ? 'For developers' : 'For business'}</span>
              {track.flag && <span className="coaching-track-flag">{track.flag}</span>}
            </div>
            <h2>{track.title}</h2>
            <p>{track.summary}</p>
            <ul className="coaching-track-bullets">
              <li><strong>£{COACHING_PRICING_HOURLY_GBP}</strong> · 1:1 hourly coaching</li>
              <li><strong>3, 6, 12</strong> · week structured programmes</li>
              {track.audience === 'developer' && <li><strong>Certificate</strong> · publicly verifiable on completion</li>}
              {track.audience === 'business' && <li><strong>Workflow audit</strong> · automations live, ops trained</li>}
            </ul>
            <Link to={`/coaching/${track.slug}`} className="coaching-track-cta">
              See the {track.audience === 'developer' ? 'developer' : 'business'} track
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </article>
        ))}
      </section>

      <section className="coaching-shared-fact fade-in">
        <div className="coaching-shared-fact-inner">
          <div className="eyebrow">Why us</div>
          <h2 className="section-title">A senior who has actually <span className="accent">shipped this stuff</span>.</h2>
          <ul className="coaching-shared-fact-list">
            <li>No "AI gurus". Senior engineers who ship for real clients every week.</li>
            <li>Live sessions on Zoom. Recordings + transcripts in your private space.</li>
            <li>1:1 booked through the platform. Stripe-paid, calendar-confirmed.</li>
            <li>Courses run in cohorts — Slack channel, code review, capstone, certificate.</li>
            <li>Money back inside the first session if it's not working.</li>
          </ul>
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

export default Coaching;
