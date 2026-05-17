import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import './App.css';

const Developers = () => {
  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    window.location.href = `/${sectionId}`;
  };

  useEffect(() => {
    const sections = document.querySelectorAll('.fade-in');
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { root: null, rootMargin: '0px', threshold: 0.1 });
    sections.forEach(section => observer.observe(section));
    return () => sections.forEach(section => observer.unobserve(section));
  }, []);

  const steps = [
    { num: '01', title: 'Apply', body: 'Send us your GitHub, a short note on what you build, and the stack you\'re strongest in. No CV theatre.' },
    { num: '02', title: 'Paid Trial Task', body: 'A small, scoped, real-world task — paid. We assess code quality, communication, and how you work with AI tooling.' },
    { num: '03', title: 'Join the Bench', body: 'Pass the trial and you\'re on our roster. We route paid work to you as it comes in, matched to your skills.' },
    { num: '04', title: 'Grow', body: 'Mentorship from senior engineers, exposure to real clients, and a steady pipeline of work to build your portfolio.' },
  ];

  return (
    <div className="App">
      <Header handleNavClick={handleNavClick} />
      <section className="dev-hero fade-in">
        <div className="hero-eyebrow"><span className="hero-dot" /> For Developers</div>
        <h1>
          Real <span className="accent">paid work</span>,<br />
          while you prove what you can do.
        </h1>
        <p>
          The job market is brutal. We built a programme for developers to get tested, trusted,
          and paid &mdash; without needing five years of "experience" on a CV. Pass our trial, join
          our bench, and we route real client work to you.
        </p>
        <div className="buttons">
          <a href="mailto:support@out-of-house.com?subject=Developer%20Application">
            <button className="primary-btn"><span>Apply Now</span></button>
          </a>
          <Link to="/">
            <button className="secondary-btn"><span>Back to Home</span></button>
          </Link>
        </div>
      </section>

      <section className="dev-pillars fade-in">
        <div className="dev-pillar">
          <h3>For Developers</h3>
          <ul>
            <li>Paid trial task — no unpaid take-homes</li>
            <li>Real client work routed to you once you pass</li>
            <li>Mentorship from senior engineers</li>
            <li>Work alongside modern AI tooling that makes you faster</li>
            <li>Build a portfolio of shipped, paid projects</li>
          </ul>
        </div>
        <div className="dev-pillar">
          <h3>For Companies</h3>
          <ul>
            <li>Access vetted, trial-tested engineers on demand</li>
            <li>Every project led by a senior, code reviewed before ship</li>
            <li>Scale capacity up or down without a hiring cycle</li>
            <li>One point of contact — we handle the team</li>
            <li>Same AI-augmented delivery speed across the bench</li>
          </ul>
        </div>
      </section>

      <section className="workflow-section fade-in">
        <div className="eyebrow">How the programme works</div>
        <h2 className="section-title">From application to <span className="accent">paid work</span>, in four steps.</h2>
        <div className="workflow-steps">
          {steps.map(s => (
            <div key={s.num} className="workflow-step">
              <div className="workflow-step-num">{s.num}</div>
              <h4>{s.title}</h4>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="dev-cta fade-in">
        <h2>Ready to be on the bench?</h2>
        <p>Send us your GitHub and a short note. We reply within 48 hours.</p>
        <a href="mailto:support@out-of-house.com?subject=Developer%20Application">
          <button className="primary-btn"><span>Apply Now</span></button>
        </a>
      </section>

      <footer className="terms-conditions">
        <div className="terms-container">
          <Link to="/terms-and-conditions"><p className="terms-conditions-link">Terms and conditions</p></Link>
          <p>&#123;out-of-house.dev&#125;. All Rights Reserved. © Copyright 2026</p>
          <Link to="/privacy-policy"><p className="terms-conditions-link">Privacy policy</p></Link>
        </div>
      </footer>
    </div>
  );
};

export default Developers;
