import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Route, Routes, Link, Navigate, useLocation } from 'react-router-dom';
import Header from './Header';
import TermsAndConditions from './TermsAndConditions';
import PrivacyPolicy from './PrivacyPolicy';
import Developers from './Developers';
import PricingCalculator from './PricingCalculator';
import HorizontalSteps from './HorizontalSteps';
import Showcase from './Showcase';
import { AuthProvider } from './lib/AuthProvider';
import { ProtectedRoute, PublicOnlyRoute } from './lib/ProtectedRoute';
import Apply from './pages/Apply';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import AppShell from './pages/app/AppShell';
import Dashboard from './pages/app/Dashboard';
import Projects from './pages/app/Projects';
import ProjectDetail from './pages/app/ProjectDetail';
import RequestDetail from './pages/app/RequestDetail';
import BookCall from './pages/app/BookCall';
import Settings from './pages/app/Settings';
import Applications from './pages/app/admin/Applications';
import Users from './pages/app/admin/Users';
import Board from './pages/app/dev/Board';
import PlanLibrary from './pages/app/dev/PlanLibrary';
import PlanTemplate from './pages/app/dev/PlanTemplate';
import './App.css';

import SvgCoWorking from './images/undraw_online_banking_re_kwqh.svg';
import SvgSpeedTest from './images/undraw_speed_test_re_pe1f.svg';
import SvgOnTheWay from './images/undraw_on_the_way_re_swjt.svg';
import SvgAcceptRequest from './images/undraw_accept_request_re_d81h.svg';
import SvgStandOut from './images/undraw_stand_out_-1-oag.svg';
import SvgTimeManagement from './images/undraw_time_management_re_tk5w.svg';
import SvgStability from './images/undraw_stability_ball_b-4-ia.svg';
import SvgCreditCardPayments from './images/undraw_credit_card_payments_re_qboh.svg';
import SvgCancel from './images/undraw_cancel_re_pkdm.svg';

function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [openServiceIndex, setOpenServiceIndex] = useState(0);

  // If we arrived here because a nav link on another page asked us to
  // scroll to a section, consume the stashed target and scroll once the
  // DOM is painted.
  useEffect(() => {
    let target = null;
    try { target = sessionStorage.getItem('scrollToSection'); } catch {}
    if (!target) return;
    try { sessionStorage.removeItem('scrollToSection'); } catch {}
    // wait a tick so the section refs are mounted
    const t = setTimeout(() => {
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const sectionIds = ['home', 'services', 'workflow', 'benefits', 'pricing', 'faq', 'contact-us'];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    }, { root: null, rootMargin: '0px', threshold: 0.15 });

    sectionIds.forEach(id => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => {
      sectionIds.forEach(id => {
        const section = document.getElementById(id);
        if (section) observer.unobserve(section);
      });
    };
  }, []);

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

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('highlight');
        else entry.target.classList.remove('highlight');
      });
    }, { root: null, rootMargin: '0px', threshold: 0.2 });

    const benefitItems = document.querySelectorAll('.benefit-item');
    const pricingCards = document.querySelectorAll('.pricing-card');
    benefitItems.forEach(item => observer.observe(item));
    pricingCards.forEach(card => observer.observe(card));
    return () => {
      benefitItems.forEach(item => observer.unobserve(item));
      pricingCards.forEach(card => observer.unobserve(card));
    };
  }, []);

  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    // sectionId looks like "#services". HashRouter encodes the route in
    // the URL hash, so when we're NOT on `/` we need to go to `/#/` and
    // then scroll. Setting window.location.hash directly would shadow the
    // router. Easiest: send the user to the root, then scroll after mount.
    if (window.location.hash !== '#/' && window.location.hash !== '') {
      // Stash the target so the home page can scroll to it on next mount.
      try { sessionStorage.setItem('scrollToSection', sectionId); } catch {}
      window.location.href = window.location.origin + '/#/';
      return;
    }
    const section = document.querySelector(sectionId);
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleService = (index) => {
    setOpenServiceIndex(openServiceIndex === index ? null : index);
  };

  const servicesContent = [
    {
      title: "AI Automations",
      description: `Our flagship offering. We design and deploy <strong>custom AI automations</strong> that take repetitive, time-draining work off your team's plate &mdash; <strong>lead routing, inbox triage, document processing, internal copilots, CRM enrichment, support agents</strong>, and bespoke multi-step workflows. Integrated with the systems you already use (Slack, Notion, HubSpot, Gmail, Stripe, Airtable, your own APIs). Most automations are scoped on a call, built, and live <strong>within days, not months</strong>.`
    },
    {
      title: "Websites & Landing Pages",
      description: `High-converting <strong>marketing sites</strong> and <strong>landing pages</strong>, designed with intent and built to load fast. Modern stack, modern hosting, and a delivery process that can take a brief through to <strong>a live site the same day you talk to us</strong>. SEO, analytics, and CMS integration included. We even host it for you for £100/month so you never have to think about it again.`
    },
    {
      title: "Web Apps & SaaS Products",
      description: `Full <strong>web application</strong> and <strong>SaaS</strong> builds &mdash; auth, billing, dashboards, multi-tenant logic, AI features baked in where they matter. We start with a call to understand exactly what you need, then ship MVPs in <strong>weeks instead of quarters</strong> at a quality level that holds up to real users.`
    },
    {
      title: "Custom Internal Software",
      description: `Bespoke <strong>internal tools</strong>, dashboards, and operations software built around how <em>your</em> business actually runs. Replace the spreadsheets, the manual handoffs, and the SaaS subscriptions that almost-fit. We integrate with your existing stack and ship working software faster than you'd expect.`
    },
    {
      title: "Ongoing Growth & Maintenance",
      description: `Once you're live, we keep things moving &mdash; <strong>feature iteration, performance optimisation, security patching</strong>, and continuous improvement of your AI automations as your processes evolve. Flexible monthly engagement, pause or scale at any time.`
    }
  ];

  const faqContent = [
    {
      question: "How can you deliver so fast?",
      answer: `Two reasons. First, every project starts with a real call so we leave knowing exactly what "done" looks like, no wasted iterations. Second, we've built our internal delivery process to be radically faster than a traditional agency, while keeping a senior engineer reviewing every line of code before it ships. The result is that work which would take a competitor weeks takes us days, and a one-page site can genuinely go live the same day.`
    },
    {
      question: "What exactly is an \"AI automation\"?",
      answer: `Anything where AI can replace manual work. Examples: an agent that drafts replies to inbound sales emails, an automation that ingests PDFs and writes structured records to your CRM, an internal copilot that answers questions over your company docs, or a multi-step workflow that watches Stripe, tags customers in HubSpot, and pings Slack. If a human is doing it repeatedly, it's a candidate.`
    },
    {
      question: "Do you work with our existing tools and codebase?",
      answer: `Yes. We integrate with the stack you already run on &mdash; Slack, Notion, HubSpot, Airtable, Google Workspace, custom APIs, your GitHub repos. We can fork an existing repo, work in yours directly, or stand up something new. Whatever's least disruptive to your team.`
    },
    {
      question: "Do you actually talk to us, or is everything async?",
      answer: `Every engagement starts with a real call. We want to understand your business, your team, and what success looks like before we touch a keyboard. After that you get direct Slack access to the engineer doing the work, and we hop on calls whenever decisions need a human on the other end. Personal, not corporate.`
    },
    {
      question: "Why is your pricing lower than other agencies?",
      answer: `Because our delivery process is leaner than theirs. A small business website used to mean 6 weeks of meetings and £5,000+ in invoices. With our process, we can do it in a day and price it accordingly. We pass the savings on instead of pretending we're still in 2018.`
    },
    {
      question: "What if I'm not happy with the result?",
      answer: `Tell us during the first billing cycle and we'll refund it. For one-off projects, we agree acceptance criteria on the kick-off call and don't consider a build done until you sign it off.`
    }
  ];

  return (
    <AuthProvider>
    <Router>
      <div className="App">
        <HeaderGate activeSection={activeSection} handleNavClick={handleNavClick} />
        <Routes>
          <Route
            path="/"
            exact
            element={
              <div>
                <section id="home" className="main-content fade-in">
                  <div className="hero-eyebrow">
                    <span className="hero-dot" /> AI-powered software studio
                  </div>
                  <h1>
                    AI automations &amp; software,<br />
                    shipped at a pace <span className="accent">others can't match</span>.
                  </h1>
                  <p className="lead">
                    Senior engineers backed by next-generation tooling, delivering AI automations,
                    websites, web apps, and custom software at speeds traditional agencies can't touch.
                    Every project starts with a real call &mdash; we want to understand your business before we build for it.
                  </p>
                  <div className="buttons">
                    <a href="https://cal.com/out-of-house.dev" target="_blank" rel="noopener noreferrer">
                      <button className="primary-btn"><span>Book a Discovery Call</span></button>
                    </a>
                    <button
                      className="secondary-btn"
                      onClick={(e) => handleNavClick(e, '#services')}
                    >
                      <span>Explore Services</span>
                    </button>
                  </div>
                </section>

                <section className="stats-bar fade-in">
                  <div className="stats-container">
                    <div className="stat-item">
                      <div className="stat-number">Same-day</div>
                      <p>Turnaround on most websites &amp; small builds</p>
                    </div>
                    <div className="stat-item">
                      <div className="stat-number">Days, not months</div>
                      <p>Typical timeline for AI automations &amp; MVPs</p>
                    </div>
                    <div className="stat-item">
                      <div className="stat-number">Every line</div>
                      <p>Reviewed by a senior engineer before it ships</p>
                    </div>
                    <div className="stat-item">
                      <div className="stat-number">Real calls</div>
                      <p>Every project starts &amp; stays personal</p>
                    </div>
                  </div>
                </section>

                <section id="services" className="services-section fade-in">
                  <div className="eyebrow">Services</div>
                  <h2 className="section-title">
                    From AI automations to full product builds, <span className="accent">delivered fast</span>.
                  </h2>
                  <div className="services-list">
                    {servicesContent.map((service, index) => (
                      <div
                        key={index}
                        className={`service-item ${openServiceIndex === index ? 'open' : ''}`}
                        onClick={() => toggleService(index)}
                      >
                        <div className="service-title-container">
                          <h3>
                            {index === 0 && <span className="service-flag">Flagship</span>}
                            {service.title}
                          </h3>
                          <span className="toggle-sign">{openServiceIndex === index ? '−' : '+'}</span>
                        </div>
                        <p dangerouslySetInnerHTML={{ __html: service.description }}></p>
                      </div>
                    ))}
                  </div>
                </section>

                <HorizontalSteps />

                <Showcase />

                <section id="benefits" className="benefits-section fade-in">
                  <div className="eyebrow">Why us</div>
                  <h2 className="section-title">
                    Built to deliver at a pace <span className="accent">others can't match</span>.
                  </h2>
                  <div className="benefits-grid">
                    <div className="benefit-item">
                      <img src={SvgSpeedTest} alt="" />
                      <h4>Same-Day Delivery</h4>
                      <p>Most websites, prototypes, and single-purpose automations go live the same day you brief us.</p>
                    </div>
                    <div className="benefit-item">
                      <img src={SvgStandOut} alt="" />
                      <h4>Senior-Only Engineering</h4>
                      <p>No juniors learning on your dime. Every line is written or reviewed by a senior engineer.</p>
                    </div>
                    <div className="benefit-item">
                      <img src={SvgAcceptRequest} alt="" />
                      <h4>Real Conversations</h4>
                      <p>Every project starts with a call. We want to understand your business, not just your brief.</p>
                    </div>
                    <div className="benefit-item">
                      <img src={SvgCreditCardPayments} alt="" />
                      <h4>Transparent Fixed Pricing</h4>
                      <p>One-off projects scoped up front. Monthly engagements at a fixed rate. No hourly surprises.</p>
                    </div>
                    <div className="benefit-item">
                      <img src={SvgStability} alt="" />
                      <h4>Built Around Your Stack</h4>
                      <p>We plug into Slack, Notion, HubSpot, GitHub, your APIs &mdash; whatever you already run on.</p>
                    </div>
                    <div className="benefit-item">
                      <img src={SvgTimeManagement} alt="" />
                      <h4>&lt; 24 Hour Onboarding</h4>
                      <p>From signed quote to first commit in under a day. No drawn-out kick-offs.</p>
                    </div>
                    <div className="benefit-item">
                      <img src={SvgOnTheWay} alt="" />
                      <h4>100% Yours</h4>
                      <p>Custom-built for your business &mdash; you own the code, the infrastructure, and the automations.</p>
                    </div>
                    <div className="benefit-item">
                      <img src={SvgCancel} alt="" />
                      <h4>Pause or Cancel Anytime</h4>
                      <p>Monthly engagements pause when work slows and resume when you need us again. No lock-in.</p>
                    </div>
                    <div className="benefit-item">
                      <img src={SvgCoWorking} alt="" />
                      <h4>Not Happy? Money Back</h4>
                      <p>If you're not happy in the first month of a monthly engagement, we refund it. Simple.</p>
                    </div>
                  </div>
                </section>

                <section id="pricing" className="pricing-section fade-in">
                  <div className="eyebrow">Pricing</div>
                  <h2 className="section-title">
                    Honest prices for the <span className="accent">2026 way of building</span>.
                  </h2>

                  <div className="trust-strip">
                    <div className="trust-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                      <div><strong>Fixed price, agreed up front</strong><span>No hourly billing. No timesheet padding.</span></div>
                    </div>
                    <div className="trust-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                      <div><strong>Zero hidden fees</strong><span>What you see in the quote is what you pay.</span></div>
                    </div>
                    <div className="trust-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                      <div><strong>You own everything</strong><span>Code, infrastructure, automations — yours.</span></div>
                    </div>
                  </div>

                  <div className="pricing-options">
                    <div className="pricing-card">
                      <h3>Starter Site</h3>
                      <div className="pricing-tagline">
                        <p>For local businesses &amp; solo founders.</p>
                        <p>A real website, live the same day.</p>
                      </div>
                      <p className="price-point">£500</p>
                      <p className="price-suffix">+ £100/month hosting &amp; care</p>
                      <a href="https://cal.com/out-of-house.dev" target="_blank" rel="noopener noreferrer">
                        <button><span>Book a Call</span></button>
                      </a>
                      <div className="pricing-details">
                        <ul>
                          <li>Up to 5 pages, mobile-perfect</li>
                          <li>SEO, analytics, contact form</li>
                          <li>Hosted by us on IONOS &mdash; never worry about it</li>
                          <li>Same-day or next-day go-live</li>
                          <li>Monthly care: updates, fixes, backups</li>
                          <li>Cancel hosting anytime, you keep the site</li>
                        </ul>
                      </div>
                    </div>

                    <div className="pricing-card pricing-card-featured">
                      <div className="pricing-badge">Most Popular</div>
                      <h3>Custom Build</h3>
                      <div className="pricing-tagline">
                        <p>AI automation, MVP, web app, or internal tool.</p>
                        <p>Scoped on a call, fixed price.</p>
                      </div>
                      <p className="price-point">from £750</p>
                      <p className="price-suffix">one-off &mdash; final quote within 24h of call</p>
                      <a href="https://cal.com/out-of-house.dev" target="_blank" rel="noopener noreferrer">
                        <button><span>Scope a Project</span></button>
                      </a>
                      <div className="pricing-details">
                        <ul>
                          <li>Scoped &amp; quoted within 24 hours</li>
                          <li>Often delivered same-week</li>
                          <li>AI automation, prototype, internal tool, or MVP</li>
                          <li>Integration with your tools &amp; APIs</li>
                          <li>You own the code &amp; infrastructure</li>
                          <li>Acceptance criteria signed off before completion</li>
                          <li>30 days of post-launch fixes included</li>
                        </ul>
                      </div>
                    </div>

                    <div className="pricing-card">
                      <h3>Monthly Engagement</h3>
                      <div className="pricing-tagline">
                        <p>A senior team on tap for ongoing work.</p>
                        <p>Pause anytime, no lock-in.</p>
                      </div>
                      <p className="price-point">from £1,500</p>
                      <p className="price-suffix">/month &mdash; scaled to your scope</p>
                      <a href="https://cal.com/out-of-house.dev" target="_blank" rel="noopener noreferrer">
                        <button><span>Start Engagement</span></button>
                      </a>
                      <div className="pricing-details">
                        <ul>
                          <li>Dedicated senior engineer + delivery lead</li>
                          <li>Unlimited requests within scope</li>
                          <li>Continuous shipping &mdash; typically 2&ndash;3 day cycles</li>
                          <li>Direct Slack access to the team</li>
                          <li>Features, automations, maintenance, iteration</li>
                          <li>Pause or cancel anytime</li>
                          <li>First-month money-back guarantee</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="invoice-callout">
                    <div className="invoice-callout-head">
                      <span className="invoice-eyebrow">What you'll <em>never</em> see on our invoices</span>
                    </div>
                    <ul className="invoice-list">
                      <li><span className="invoice-x" aria-hidden="true">×</span> Surprise "out of scope" charges</li>
                      <li><span className="invoice-x" aria-hidden="true">×</span> Hourly billing or timesheet overruns</li>
                      <li><span className="invoice-x" aria-hidden="true">×</span> Licensing fees for code we write for you</li>
                      <li><span className="invoice-x" aria-hidden="true">×</span> Lock-in to our hosting or our tools</li>
                      <li><span className="invoice-x" aria-hidden="true">×</span> Inflated "discovery phase" invoices before any code</li>
                      <li><span className="invoice-x" aria-hidden="true">×</span> Cancellation fees on the monthly plan</li>
                    </ul>
                    <p className="invoice-foot">
                      <strong>Why is everything so reasonable?</strong> Our delivery process is leaner than a traditional agency's,
                      so we deliver in a fraction of the time. We pass those savings on instead of pricing like it's still 2018.
                    </p>
                  </div>
                </section>

                <section id="calculator" className="calculator-section fade-in">
                  <div className="eyebrow">Estimate</div>
                  <h2 className="section-title">
                    Build your <span className="accent">rough quote</span> in 20 seconds.
                  </h2>
                  <PricingCalculator />
                </section>

                <section id="faq" className="faq-section fade-in">
                  <div className="eyebrow">FAQ</div>
                  <h2 className="section-title">Common questions.</h2>
                  <div className="faq-list">
                    {faqContent.map((faq, index) => (
                      <div
                        key={index}
                        className={`faq-item ${openFaqIndex === index ? 'open' : ''}`}
                        onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                      >
                        <div className="faq-title-container">
                          <h3>{faq.question}</h3>
                          <span className="toggle-sign">{openFaqIndex === index ? '−' : '+'}</span>
                        </div>
                        <p dangerouslySetInnerHTML={{ __html: faq.answer }}></p>
                      </div>
                    ))}
                  </div>
                </section>

                <section id="contact-us" className="contact-us-section">
                  <div className="contact-us-container">
                    <div className="contact-us-header">
                      <div className="contact-grid fade-in">
                        <div className="contact-title">Contact</div>
                        <span className="contact-highlighted">
                          <a href="https://cal.com/out-of-house.dev" target="_blank" rel="noopener noreferrer">
                            <button className="contact-btn">Contact Us</button>
                          </a>
                          <div className="contact-gradient-text">us</div>
                        </span>
                        <div className="contact-subtitle">Book a call to scope your build</div>
                      </div>
                    </div>
                    <div className="contact-us-mobile-cta">
                      <a href="https://cal.com/out-of-house.dev" target="_blank" rel="noopener noreferrer">
                        <button>Book a Call →</button>
                      </a>
                    </div>
                    <div className="contact-us-details">
                      <div className="company-info">
                        <h3 className="company-name">&#123;out-of-house.dev&#125;</h3>
                        <p className="company-slogan">AI automations &amp; software,<br />shipped at a pace others can't match.</p>
                      </div>
                      <div className="company-details">
                        <p><strong>Email</strong></p>
                        <p>support@out-of-house.com</p>
                        <p><strong>Phone</strong></p>
                        <p>+44 07742 952173</p>
                        <p><strong>Location</strong></p>
                        <p>United Kingdom</p>
                      </div>
                      <div className="company-socials">
                        <p><strong>Company</strong></p>
                        <Link to="/developers" className="social-link">For Developers</Link>
                        <a href="#" className="social-link">LinkedIn</a>
                        <a href="#" className="social-link">Instagram</a>
                        <a href="#" className="social-link">WhatsApp</a>
                      </div>
                    </div>
                  </div>
                </section>
                <footer className="terms-conditions">
                  <div className="terms-container">
                    <Link to="/terms-and-conditions">
                      <p className="terms-conditions-link">Terms and conditions</p>
                    </Link>
                    <p>&#123;out-of-house.dev&#125;. All Rights Reserved. © 2026</p>
                    <Link to="/privacy-policy">
                      <p className="terms-conditions-link">Privacy policy</p>
                    </Link>
                  </div>
                </footer>
              </div>
            }
          />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/developers" element={<Developers />} />

          {/* Auth */}
          <Route path="/apply"          element={<PublicOnlyRoute><Apply /></PublicOnlyRoute>} />
          <Route path="/login"          element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/auth/callback"  element={<AuthCallback />} />

          {/* Authenticated app */}
          <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route index                     element={<Dashboard />} />
            <Route path="projects"           element={<Projects />} />
            <Route path="projects/:id"       element={<ProjectDetail />} />
            <Route path="requests/:id"       element={<RequestDetail />} />
            <Route path="book"               element={<BookCall />} />
            <Route path="settings"           element={<Settings />} />
            <Route path="board"              element={<ProtectedRoute roles={['developer','admin']}><Board /></ProtectedRoute>} />
            <Route path="plans"              element={<ProtectedRoute roles={['developer','admin']}><PlanLibrary /></ProtectedRoute>} />
            <Route path="plans/:id"          element={<ProtectedRoute roles={['developer','admin']}><PlanTemplate /></ProtectedRoute>} />
            <Route path="admin/applications" element={<ProtectedRoute roles={['admin']}><Applications /></ProtectedRoute>} />
            <Route path="admin/users"        element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
          </Route>

          {/* Anything that doesn't match — including stray /#/ variants —
              goes home rather than rendering a white screen. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
    </AuthProvider>
  );
}

const HeaderGate = (props) => {
  const { pathname } = useLocation();
  const hide = pathname.startsWith('/app') ||
               pathname === '/login' ||
               pathname === '/apply' ||
               pathname.startsWith('/auth/');
  if (hide) return null;
  return <Header {...props} />;
};

export default App;
