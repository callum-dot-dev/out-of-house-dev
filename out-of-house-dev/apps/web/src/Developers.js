import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import HorizontalSteps from './HorizontalSteps';
import './App.css';

const Developers = () => {
  useEffect(() => {
    const sections = document.querySelectorAll('.fade-in');
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { root: null, rootMargin: '0px', threshold: 0.1 });
    sections.forEach((section) => observer.observe(section));
    return () => sections.forEach((section) => observer.unobserve(section));
  }, []);

  const devSteps = [
    { num: '01', accent: 'Step 1',     title: 'Apply',           body: "Send us your GitHub, a short note on what you build, and the stack you're strongest in. No CV theatre. We read code." },
    { num: '02', accent: 'Paid',       title: 'Paid trial task', body: 'A small, scoped, real-world task, paid. We assess code quality, communication, and how you work with AI tooling.' },
    { num: '03', accent: 'On the bench', title: 'Join the bench', body: "Pass the trial and you're on our roster. We route paid work to you as it comes in, matched to your skills and capacity." },
    { num: '04', accent: 'Ongoing',    title: 'Grow',            body: 'Mentorship from senior engineers, exposure to real clients, and a steady pipeline of work to build your portfolio.' },
  ];

  return (
    <div className="App">
      <Header />
      <section className="dev-hero fade-in">
        <div className="hero-eyebrow"><span className="hero-dot" /> For developers</div>
        <h1>
          Real <span className="accent">paid work</span>,<br />
          while you prove what you can do.
        </h1>
        <p>
          The job market is brutal. We built a programme for developers to get tested, trusted, and paid,
          without needing five years of experience on a CV. Pass our trial, join our bench, and we route real client work to you.
        </p>
        <div className="buttons">
          <Link to="/apply?utm_source=devs_hero">
            <button className="primary-btn"><span>Apply now</span></button>
          </Link>
          <Link to="/">
            <button className="secondary-btn"><span>Back to home</span></button>
          </Link>
        </div>
      </section>

      <section className="dev-pillars fade-in">
        <div className="dev-pillar">
          <h3>For developers</h3>
          <ul>
            <li>Paid trial task. No unpaid take-homes.</li>
            <li>Real client work routed to you once you pass.</li>
            <li>Mentorship from senior engineers.</li>
            <li>Work alongside modern AI tooling that makes you faster.</li>
            <li>Build a portfolio of shipped, paid projects.</li>
          </ul>
        </div>
        <div className="dev-pillar">
          <h3>For companies</h3>
          <ul>
            <li>Access vetted, trial-tested engineers on demand.</li>
            <li>Every project led by a senior, code reviewed before ship.</li>
            <li>Scale capacity up or down without a hiring cycle.</li>
            <li>One point of contact. We handle the team.</li>
            <li>Same AI-augmented delivery speed across the bench.</li>
          </ul>
        </div>
      </section>

      <HorizontalSteps
        id="dev-programme"
        steps={devSteps}
        header={{
          eyebrow: 'How the programme works',
          title: (<>From application to <span className="accent">paid work</span>, in four steps.</>),
        }}
      />

      <section className="dev-cta fade-in">
        <h2>Ready to be on the bench?</h2>
        <p>Send us your GitHub and a short note. We reply within one business day.</p>
        <Link to="/apply?utm_source=devs_cta">
          <button className="primary-btn"><span>Apply now</span></button>
        </Link>
        <p className="dev-cta-note">We pay for trial tasks because your time is worth money before we&apos;ve decided anything.</p>
      </section>

      <footer className="terms-conditions">
        <div className="terms-container">
          <Link to="/terms-and-conditions"><p className="terms-conditions-link">Terms and conditions</p></Link>
          <p>&#123;out-of-house.dev&#125;. All rights reserved. © 2026</p>
          <Link to="/privacy-policy"><p className="terms-conditions-link">Privacy policy</p></Link>
        </div>
      </footer>
    </div>
  );
};

export default Developers;
