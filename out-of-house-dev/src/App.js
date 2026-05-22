import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import PricingCalculator from './PricingCalculator';
import HorizontalSteps from './HorizontalSteps';
import Showcase from './Showcase';
import { AuthProvider } from './lib/AuthProvider';
import { ProtectedRoute, PublicOnlyRoute } from './lib/ProtectedRoute';
import { ToastProvider } from './lib/toast';
import ErrorBoundary from './lib/ErrorBoundary';
import CookieBanner from './components/CookieBanner';
import { SkeletonPage } from './components/Skeleton';
import { SERVICES as SERVICE_DATA } from './data/services';
import './App.css';

const Apply              = lazy(() => import('./pages/Apply'));
const Login              = lazy(() => import('./pages/Login'));
const AuthCallback       = lazy(() => import('./pages/AuthCallback'));
const PasswordReset      = lazy(() => import('./pages/PasswordReset'));
const TermsAndConditions = lazy(() => import('./TermsAndConditions'));
const PrivacyPolicy      = lazy(() => import('./PrivacyPolicy'));
const Developers         = lazy(() => import('./Developers'));
const Trust              = lazy(() => import('./pages/Trust'));
const Subprocessors      = lazy(() => import('./pages/Subprocessors'));
const ShowcasePage       = lazy(() => import('./pages/Showcase'));
const Changelog          = lazy(() => import('./pages/Changelog'));
const ServicePage        = lazy(() => import('./pages/ServicePage'));
const Coaching           = lazy(() => import('./pages/Coaching'));
const CoachingTrack      = lazy(() => import('./pages/CoachingTrack'));
const Courses            = lazy(() => import('./pages/Courses'));
const CourseDetail       = lazy(() => import('./pages/CourseDetail'));
const Saas               = lazy(() => import('./pages/Saas'));
const LogoVault          = lazy(() => import('./pages/LogoVault'));
const LeadGen            = lazy(() => import('./pages/LeadGen'));
const CertificateVerify  = lazy(() => import('./pages/CertificateVerify'));
const AISEO              = lazy(() => import('./pages/AISEO'));

const AppShell      = lazy(() => import('./pages/app/AppShell'));
const Dashboard     = lazy(() => import('./pages/app/Dashboard'));
const Projects      = lazy(() => import('./pages/app/Projects'));
const ProjectDetail = lazy(() => import('./pages/app/ProjectDetail'));
const RequestDetail = lazy(() => import('./pages/app/RequestDetail'));
const BookCall      = lazy(() => import('./pages/app/BookCall'));
const Settings      = lazy(() => import('./pages/app/Settings'));
const Notifications = lazy(() => import('./pages/app/Notifications'));
const Billing       = lazy(() => import('./pages/app/client/Billing'));
const Documents     = lazy(() => import('./pages/app/Documents'));
const Applications  = lazy(() => import('./pages/app/admin/Applications'));
const Users         = lazy(() => import('./pages/app/admin/Users'));
const Audit         = lazy(() => import('./pages/app/admin/Audit'));
const Board         = lazy(() => import('./pages/app/dev/Board'));
const PlanLibrary   = lazy(() => import('./pages/app/dev/PlanLibrary'));
const PlanTemplate  = lazy(() => import('./pages/app/dev/PlanTemplate'));

const SERVICES = SERVICE_DATA.map((s) => ({
  slug: s.slug,
  title: s.title,
  flag: s.flag,
  description: s.accordion,
}));

const FAQ = [
  {
    question: 'How can you deliver so fast?',
    answer: `Two reasons. First, every project starts with a real call so we leave knowing exactly what "done" looks like. No wasted iterations. Second, we've built our internal delivery process to be radically faster than a traditional agency, while keeping a senior engineer reviewing every line of code before it ships. The result is that work which would take a competitor weeks takes us days, and a one-page site can genuinely go live the same day.`,
  },
  {
    question: `What exactly is an "AI automation"?`,
    answer: `Anything where AI can replace manual work. Examples: an agent that drafts replies to inbound sales emails, an automation that ingests PDFs and writes structured records to your CRM, an internal copilot that answers questions over your company docs, multi-agent workflows where one agent plans and another executes, or a RAG-powered search across your whole knowledge base. If a human is doing it repeatedly, it's a candidate.`,
  },
  {
    question: 'Can you actually generate leads, or just route them?',
    answer: `Both. Our AI growth engine identifies your ideal-fit accounts from public data (LinkedIn, news, hiring signals, tech stack), drafts personalised outreach in your voice, and runs AI-driven social and content campaigns tuned to what your audience actually engages with. The result is a small team's worth of SDR output without the headcount — booked meetings on your calendar instead of more lists for someone to chase.`,
  },
  {
    question: 'How do you make sure an AI feature is actually reliable?',
    answer: `Two things most teams skip. Evals — test suites that score every change for correctness, tone, and regressions, so we don't ship blind. And observability — full traces and replays of every agent run, so when something fails in production you see exactly what the model saw and why it chose what it chose. AI we ship goes into production with the same rigour as the rest of your stack.`,
  },
  {
    question: 'Do you work with our existing tools and codebase?',
    answer: `Yes. We integrate with the stack you already run on: Slack, Notion, HubSpot, Airtable, Google Workspace, custom APIs, your GitHub repos. We can fork an existing repo, work in yours directly, or stand up something new. Whatever is least disruptive to your team.`,
  },
  {
    question: 'Do you actually talk to us, or is everything async?',
    answer: `Every engagement starts with a real call. We want to understand your business, your team, and what success looks like before we touch a keyboard. After that you get direct Slack access to the engineer doing the work, and we hop on calls whenever decisions need a human on the other end. Personal, not corporate.`,
  },
  {
    question: 'Why is your pricing lower than other agencies?',
    answer: `Because our delivery process is leaner than theirs. A small business website used to mean six weeks of meetings and £5,000+ in invoices. With our process, we can do it in a day and price it accordingly. We pass the savings on instead of pretending we're still in 2018.`,
  },
  {
    question: `What if I'm not happy with the result?`,
    answer: `Tell us during the first billing cycle and we'll refund it. For one-off projects, we agree acceptance criteria on the kick-off call and don't consider a build done until you sign it off.`,
  },
];

const PROOF_POINTS = [
  { kicker: 'Same day',         phrase: 'live sites' },
  { kicker: 'Days, not months', phrase: 'for AI automations and MVPs' },
  { kicker: 'Senior only',      phrase: 'engineers on every project' },
  { kicker: 'Money back',       phrase: 'first month of any retainer' },
];

const POSITIONING_PATHS = [
  {
    tag: 'AI alone',
    title: 'AI without a human is unreliable.',
    body: `It hallucinates, it makes confident mistakes, it has no judgement about your business. AI is brilliant at the typing. Someone still has to know what to build, why, and when to throw the output away.`,
    pains: ['No accountability', 'No business context', 'Needs technical input', 'Output without judgement'],
  },
  {
    tag: 'In-house',
    title: 'Hiring in-house is slow and expensive.',
    body: `Six-month hiring cycles. £80k+ salaries. NI, pension, holiday, sick days, training, equipment, line-management time. By the time your first developer ships their first feature, we'd have shipped your tenth.`,
    pains: ['£80k+ per senior hire', 'Months of hiring cycle', 'HR, NI, pension, equipment', 'One person, one bottleneck'],
  },
  {
    tag: 'DIY',
    title: 'Doing it yourself rarely gets far.',
    body: `Without a technical background, you can spin up a Wix site or wire two Zapiers. The moment the problem is bespoke, the project stalls. Most founders we talk to have a half-finished build they cannot get past 70%.`,
    pains: ['Steep technical learning curve', 'Time you don\'t have', 'No second opinion on architecture', 'Stalls at "almost done"'],
  },
];

const CAPABILITIES = [
  {
    cat: 'Coaching',
    title: 'AI workflow integration coaching',
    body: `Hands-on coaching for your team. We sit with you, show you how senior engineers use Claude, Cursor, and the modern stack, and leave you genuinely faster. Not a slide deck — a working week of upgrades to how you build.`,
  },
  {
    cat: 'Architecture',
    title: 'RAG',
    body: `Retrieval-augmented generation, done right. We ground models in your docs, your data, and your knowledge base — with citations the model can't make up. Embeddings, vector stores, hybrid search, the lot.`,
  },
  {
    cat: 'Architecture',
    title: 'AI agents',
    body: `Agents that take action, not just answer. They read your tools, click through your apps, call your APIs, and explain what they did and why. Built with the safety rails to stay honest in production.`,
  },
  {
    cat: 'Architecture',
    title: 'Multi-agent workflows',
    body: `Specialised agents working as a team. One plans, one researches, one executes, one reviews. More reliable than asking a single model to do everything — and far easier to debug when something drifts.`,
  },
  {
    cat: 'Architecture',
    title: 'Multimodel apps',
    body: `We route each call to the right model. Claude for reasoning, GPT for breadth, smaller models for speed and cost. Lower bills, higher quality, no vendor lock-in.`,
  },
  {
    cat: 'Craft',
    title: 'Context engineering',
    body: `The discipline of giving a model exactly what it needs — and nothing it doesn't. The single biggest difference between an AI feature that ships and one that hallucinates. We treat the prompt like production code.`,
  },
  {
    cat: 'Craft',
    title: 'Token optimisation',
    body: `Most AI features burn 3× the tokens they should. We profile, cache, prune, and rewrite prompts until each call costs pennies, not pounds. Same output, a fraction of the bill.`,
  },
  {
    cat: 'Operations',
    title: 'Evals',
    sub: 'measuring what matters',
    body: `What "good" looks like, made measurable. Test suites for AI — correctness, tone, refusals, regressions. Ship changes without crossing your fingers, and catch quality drift before your users do.`,
  },
  {
    cat: 'Operations',
    title: 'Agent observability',
    body: `Traces, logs, replays. When an agent fails in production, you see exactly what it saw and why it chose what it chose. Debug AI like you debug code, not like you read tea leaves.`,
  },
];

const App = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [openServiceIndex, setOpenServiceIndex] = useState(0);

  // Cursor-aware spotlight on cards. Sets --mx/--my so the radial-gradient
  // ::after follows the pointer. rAF-throttled, only fires when over a card.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (window.matchMedia('(hover: none)').matches) return undefined;
    const SELECTOR = '.capability-card, .service-offer-card, .service-crosslink-card, .positioning-card, .dev-pillar';
    let ticking = false;
    const onMove = (e) => {
      if (ticking) return;
      const card = e.target.closest?.(SELECTOR);
      if (!card) return;
      ticking = true;
      requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * 100;
        const my = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--mx', `${mx}%`);
        card.style.setProperty('--my', `${my}%`);
        ticking = false;
      });
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => document.removeEventListener('pointermove', onMove);
  }, []);

  const toggleService = (index) => setOpenServiceIndex(openServiceIndex === index ? null : index);

  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <ErrorBoundary>
            <ScrollToTop />
            <div className="App">
              <HeaderGate activeSection={activeSection} />
              <Suspense fallback={<SkeletonPage />}>
                <Routes>
                  <Route path="/" element={(
                    <HomePage
                      services={SERVICES}
                      faq={FAQ}
                      proofPoints={PROOF_POINTS}
                      positioning={POSITIONING_PATHS}
                      capabilities={CAPABILITIES}
                      openFaqIndex={openFaqIndex}
                      setOpenFaqIndex={setOpenFaqIndex}
                      openServiceIndex={openServiceIndex}
                      toggleService={toggleService}
                      setActiveSection={setActiveSection}
                    />
                  )} />

                  <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                  <Route path="/privacy-policy"      element={<PrivacyPolicy />} />
                  <Route path="/developers"          element={<Developers />} />
                  <Route path="/services/:slug"      element={<ServicePage />} />
                  <Route path="/coaching"            element={<Coaching />} />
                  <Route path="/coaching/:track"     element={<CoachingTrack />} />
                  <Route path="/courses"             element={<Courses />} />
                  <Route path="/courses/:slug"       element={<CourseDetail />} />
                  <Route path="/saas"                element={<Saas />} />
                  <Route path="/saas/logovault"      element={<LogoVault />} />
                  <Route path="/lead-engine"         element={<LeadGen />} />
                  <Route path="/aiseo"               element={<AISEO />} />
                  <Route path="/verify/:code"        element={<CertificateVerify />} />
                  <Route path="/trust"               element={<Trust />} />
                  <Route path="/subprocessors"       element={<Subprocessors />} />
                  <Route path="/showcase"            element={<ShowcasePage />} />
                  <Route path="/changelog"           element={<Changelog />} />
                  <Route path="/changelog/:slug"     element={<Changelog />} />

                  <Route path="/apply"          element={<PublicOnlyRoute><Apply /></PublicOnlyRoute>} />
                  <Route path="/login"          element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                  <Route path="/password-reset" element={<PasswordReset />} />
                  <Route path="/auth/callback"  element={<AuthCallback />} />

                  <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                    <Route index                     element={<Dashboard />} />
                    <Route path="projects"           element={<Projects />} />
                    <Route path="projects/:id"       element={<ProjectDetail />} />
                    <Route path="requests/:id"       element={<RequestDetail />} />
                    <Route path="documents"          element={<Documents />} />
                    <Route path="book"               element={<BookCall />} />
                    <Route path="settings"           element={<Settings />} />
                    <Route path="notifications"      element={<Notifications />} />
                    <Route path="billing"            element={<ProtectedRoute roles={['client','admin']}><Billing /></ProtectedRoute>} />
                    <Route path="board"              element={<ProtectedRoute roles={['developer','admin']}><Board /></ProtectedRoute>} />
                    <Route path="plans"              element={<ProtectedRoute roles={['developer','admin']}><PlanLibrary /></ProtectedRoute>} />
                    <Route path="plans/:id"          element={<ProtectedRoute roles={['developer','admin']}><PlanTemplate /></ProtectedRoute>} />
                    <Route path="admin/applications" element={<ProtectedRoute roles={['admin']}><Applications /></ProtectedRoute>} />
                    <Route path="admin/users"        element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
                    <Route path="admin/audit"        element={<ProtectedRoute roles={['admin']}><Audit /></ProtectedRoute>} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
              <CookieBanner />
            </div>
          </ErrorBoundary>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
};

// Scrolls to top on route change, except when we have a stashed scroll
// target (cross-page nav-link → section).
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    let stash = null;
    try { stash = sessionStorage.getItem('scrollToSection'); } catch { /* ignore */ }
    if (!stash) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);
  return null;
};

const HERO_WORDS = [
  { text: 'AI', accent: false },
  { text: 'automations', accent: false },
  { text: 'and', accent: false },
  { text: 'software,', accent: false, break: true },
  { text: 'shipped', accent: false },
  { text: 'at', accent: false },
  { text: 'a', accent: false },
  { text: 'pace', accent: false, break: true },
  { text: 'others', accent: true },
  { text: 'can’t', accent: true },
  { text: 'match.', accent: true },
];

const HERO_STATUS_MESSAGES = [
  'Shipping to prod',
  'Scoping a new build',
  'Drafting an automation',
  'Reviewing a senior eng PR',
];

const HERO_WORKSHOP_ITEMS = [
  { tag: 'SHIPPING', label: 'Internal CRM v2',        meta: 'Manchester · today' },
  { tag: 'SCOPED',   label: 'AI inbox triage agent',  meta: 'London · this morning' },
  { tag: 'LIVE',     label: 'Coffee roaster website', meta: 'Bristol · yesterday' },
];

const HeroHeadline = () => (
  <>
    {HERO_WORDS.map((w, i) => (
      <React.Fragment key={i}>
        <span className="hero-word" style={{ '--i': i }}>
          <span className={`hero-word-inner ${w.accent ? 'is-accent' : ''}`}>{w.text}</span>
        </span>
        {w.break ? <br /> : ' '}
      </React.Fragment>
    ))}
  </>
);

const HeroStatus = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((n) => (n + 1) % HERO_STATUS_MESSAGES.length), 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hero-status" aria-live="off">
      <span className="hero-caret" aria-hidden="true" />
      <span className="hero-status-label">Right now:</span>
      <span key={idx} className="hero-status-text">{HERO_STATUS_MESSAGES[idx]}</span>
    </div>
  );
};

const HeroWorkshop = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const stamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return (
    <aside className="hero-workshop" aria-label="What we are working on this week">
      <header className="hero-workshop-head">
        <div className="hero-workshop-lights" aria-hidden="true">
          <span /><span /><span />
        </div>
        <span className="hero-workshop-title">in the workshop</span>
        <span className="hero-workshop-time">
          <span className={`hero-workshop-dot ${tick % 2 === 0 ? 'is-on' : ''}`} aria-hidden="true" />
          {stamp}
        </span>
      </header>
      <ul className="hero-workshop-list">
        {HERO_WORKSHOP_ITEMS.map((item, i) => (
          <li key={item.label} className="hero-workshop-row" style={{ '--i': i }}>
            <span className={`hero-workshop-tag hero-workshop-tag-${item.tag.toLowerCase()}`}>{item.tag}</span>
            <div className="hero-workshop-row-body">
              <strong>{item.label}</strong>
              <span className="hero-workshop-row-meta">{item.meta}</span>
            </div>
          </li>
        ))}
      </ul>
      <footer className="hero-workshop-foot">
        <span className="hero-workshop-foot-stat">
          <strong>4</strong>
          <span>shipping this week</span>
        </span>
        <span className="hero-workshop-foot-stat">
          <strong>18d</strong>
          <span>avg. build</span>
        </span>
        <span className="hero-workshop-foot-stat">
          <strong>100%</strong>
          <span>senior eng</span>
        </span>
      </footer>
    </aside>
  );
};

const HomePage = ({ services, faq, proofPoints, positioning, capabilities, openFaqIndex, setOpenFaqIndex, openServiceIndex, toggleService, setActiveSection }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Cross-page scroll-to-section: Header stashes the target before navigating.
  useEffect(() => {
    let target = null;
    try { target = sessionStorage.getItem('scrollToSection'); } catch { /* ignore */ }
    if (!target) return undefined;
    try { sessionStorage.removeItem('scrollToSection'); } catch { /* ignore */ }
    const t = setTimeout(() => {
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 80);
    return () => clearTimeout(t);
  }, []);

  // Track which section is in view (drives nav active state). Re-binds on every
  // HomePage mount so navigation away + back works.
  useEffect(() => {
    const sectionIds = ['home', 'positioning', 'services', 'capabilities', 'workflow', 'benefits', 'pricing', 'faq', 'contact-us'];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    }, { root: null, rootMargin: '0px', threshold: 0.15 });
    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, [setActiveSection]);

  // Fade-in observer. Same scoping — must re-bind to the new DOM after route changes.
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
    return () => observer.disconnect();
  }, []);

  const goToSection = useCallback((sectionId) => {
    if (location.pathname !== '/') {
      try { sessionStorage.setItem('scrollToSection', sectionId); } catch { /* ignore */ }
      navigate('/');
      return;
    }
    const el = document.querySelector(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [location.pathname, navigate]);

  return (
    <>
      <section id="home" className="main-content fade-in">
        <div className="hero-ambient" aria-hidden="true">
          <div className="hero-ambient-noise" />
          <div className="hero-ambient-sweep" />
        </div>

        <div className="hero-grid">
          <div className="hero-text">
            <HeroStatus />
            <h1 className="hero-h1">
              <HeroHeadline />
            </h1>
            <p className="hero-lead">
              Senior engineers, AI-native tooling, fixed-price delivery. Every project starts with a real call.
            </p>
            <div className="hero-rule" aria-hidden="true" />
            <div className="hero-actions">
              <a href="https://cal.com/out-of-house.dev" target="_blank" rel="noopener noreferrer">
                <button className="primary-btn hero-cta"><span>Book a discovery call</span></button>
              </a>
              <button
                type="button"
                className="hero-text-link"
                onClick={(e) => { e.preventDefault(); goToSection('#services'); }}
              >
                <span>Explore services</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <HeroWorkshop />
        </div>
      </section>

      <section className="proof-bar fade-in" aria-label="What we're known for">
        <div className="proof-bar-inner">
          {proofPoints.map((p) => (
            <div className="proof-item" key={p.kicker}>
              <strong>{p.kicker}</strong>
              <span>{p.phrase}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="positioning" className="positioning-section fade-in">
        <div className="positioning-head">
          <div className="eyebrow">The trilemma</div>
          <h2 className="section-title">
            AI is brilliant. <span className="accent">It still needs a human</span> to get you the outcome you actually want.
          </h2>
          <p className="positioning-lead">
            Every founder eventually faces the same three-way fork. Each path has a real cost.
          </p>
          <div className="positioning-tease">
            <span className="positioning-tease-mark" aria-hidden="true">↓</span>
            <span className="positioning-tease-text">
              We're the <span className="positioning-tease-accent">fourth option</span>.
            </span>
          </div>
        </div>

        <div className="positioning-grid">
          {positioning.map((p, i) => (
            <article key={p.tag} className="positioning-card" style={{ '--stagger-i': i }}>
              <div className="positioning-card-meta">
                <span className="positioning-card-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="positioning-tag">{p.tag}</span>
              </div>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <ul>
                {p.pains.map((pain) => (
                  <li key={pain}><span className="positioning-x" aria-hidden="true">×</span> {pain}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="positioning-bridge" aria-hidden="true">
          <span className="positioning-bridge-line" />
          <span className="positioning-bridge-pill">
            <span className="positioning-bridge-num">04</span>
            <span className="positioning-bridge-label">The fourth option</span>
          </span>
          <span className="positioning-bridge-line" />
        </div>

        <div className="positioning-resolution">
          <div className="positioning-resolution-text">
            <div className="positioning-resolution-eyebrow-row">
              <span className="positioning-resolution-num">04</span>
              <span className="positioning-resolution-eyebrow-text">The out-of-house answer</span>
            </div>
            <h3>
              <span className="brand-bracket">{`{out-of-house.dev}`}</span><br />
              The answer to your <span className="accent">in-house</span> problems.
            </h3>
            <p>
              We're senior engineers who use AI as a multiplier, not a replacement. You skip the hiring cycle,
              skip the DIY plateau, skip the AI-hallucination tax. You get working software, shipped fast,
              owned by you. No HR. No commitment. No drama.
            </p>
            <div className="positioning-resolution-actions">
              <a href="https://cal.com/out-of-house.dev" target="_blank" rel="noopener noreferrer">
                <button className="primary-btn"><span>Book a 30-minute call</span></button>
              </a>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => goToSection('#pricing')}
              >
                <span>See pricing</span>
              </button>
            </div>
          </div>
          <div className="positioning-resolution-meta">
            <div className="positioning-meta-row">
              <span className="kicker">vs in-house</span>
              <strong>~85% cheaper</strong>
              <small>No salary, NI, pension, equipment, recruitment, training, line management.</small>
            </div>
            <div className="positioning-meta-row">
              <span className="kicker">vs DIY</span>
              <strong>10× faster to live</strong>
              <small>Senior engineers + AI-native tooling. Same-week MVPs, same-day sites.</small>
            </div>
            <div className="positioning-meta-row">
              <span className="kicker">vs AI alone</span>
              <strong>Human judgement</strong>
              <small>A senior reviews every line. We tell you when AI is the wrong answer.</small>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="services-section fade-in">
        <div className="eyebrow">Services</div>
        <h2 className="section-title">
          From AI automations to full product builds, <span className="accent">delivered fast</span>.
        </h2>
        <div className="services-list">
          {services.map((service, index) => (
            <div
              key={service.title}
              className={`service-item ${openServiceIndex === index ? 'open' : ''}`}
              onClick={() => toggleService(index)}
            >
              <div className="service-title-container">
                <h3>
                  {service.flag && <span className="service-flag">{service.flag}</span>}
                  {service.title}
                </h3>
                <span className="toggle-sign" aria-hidden="true">{openServiceIndex === index ? '−' : '+'}</span>
              </div>
              <div className="service-body">
                <p dangerouslySetInnerHTML={{ __html: service.description }} />
                {service.slug && (
                  <Link
                    to={`/services/${service.slug}`}
                    className="service-detail-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Read the full breakdown
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="capabilities" className="capabilities-section fade-in">
        <div className="capabilities-head">
          <div className="eyebrow">AI capabilities</div>
          <h2 className="section-title">
            The discipline behind <span className="accent">AI that ships</span>.
          </h2>
          <p className="capabilities-lead">
            When we say "AI automations", we mean the whole stack — from retrieval to evals, from
            token costs to production traces. The unglamorous parts are why most AI projects stall.
            They are also where we make our money.
          </p>
        </div>

        <div className="capabilities-grid">
          {capabilities.map((cap, i) => (
            <article
              key={cap.title}
              className={`capability-card capability-cat-${cap.cat.toLowerCase()}`}
              style={{ '--stagger-i': i }}
            >
              <div className="capability-card-head">
                <span className="capability-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="capability-cat">{cap.cat}</span>
              </div>
              <h3>
                {cap.title}
                {cap.sub && <span className="capability-sub"> — {cap.sub}</span>}
              </h3>
              <p>{cap.body}</p>
            </article>
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

        <div className="benefits-statement">
          <article className="benefit-claim" style={{ '--stagger-i': 0 }}>
            <span className="benefit-claim-num">01</span>
            <h3>We ship same-day.</h3>
            <p>Most websites, prototypes, and single-purpose automations go live the same day you brief us. Senior engineers, working as a small team, with AI multiplying our output.</p>
          </article>
          <article className="benefit-claim" style={{ '--stagger-i': 1 }}>
            <span className="benefit-claim-num">02</span>
            <h3>You own the code.</h3>
            <p>Custom-built for your business. You keep the repo, the infrastructure, the automations. No platform lock-in, no licensing of the work we write for you.</p>
          </article>
          <article className="benefit-claim" style={{ '--stagger-i': 2 }}>
            <span className="benefit-claim-num">03</span>
            <h3>Refund the first month.</h3>
            <p>If the monthly engagement isn't working in the first cycle, we refund it. For one-off projects we agree acceptance criteria up front and don't call it done until you sign off.</p>
          </article>
        </div>

        <div className="benefits-side-wrap">
          <h4 className="benefits-side-title">Plus everything else you expect from a senior team:</h4>
          <ul className="benefits-side">
            <li>Senior engineers only. Every line written or reviewed by one.</li>
            <li>Real calls before code. Onboarding inside 24 hours.</li>
            <li>Plug into your stack: Slack, Notion, HubSpot, GitHub, your APIs.</li>
            <li>Transparent fixed pricing. No hourly surprises.</li>
            <li>Pause or cancel any monthly engagement, any month.</li>
            <li>Direct access to the engineer doing the work, not an account manager.</li>
          </ul>
        </div>
      </section>

      <section id="pricing" className="pricing-section fade-in">
        <div className="eyebrow">Pricing</div>
        <h2 className="section-title">
          Honest prices for the <span className="accent">2026 way of building</span>.
        </h2>

        <div className="trust-strip">
          <Check text="Fixed price, agreed up front" sub="No hourly billing. No timesheet padding." />
          <Check text="Zero hidden fees" sub="What you see in the quote is what you pay." />
          <Check text="You own everything" sub="Code, infrastructure, automations. Yours." />
        </div>

        <div className="pricing-options">
          <div className="pricing-card">
            <h3>Starter site</h3>
            <div className="pricing-tagline">
              <p>For local businesses and solo founders.</p>
              <p>A real website, live the same day.</p>
            </div>
            <p className="price-point">£500</p>
            <p className="price-suffix">+ £100/month hosting and care</p>
            <a href="https://cal.com/out-of-house.dev" target="_blank" rel="noopener noreferrer">
              <button><span>Book a call</span></button>
            </a>
            <div className="pricing-details">
              <ul>
                <li>Up to 5 pages, mobile-perfect</li>
                <li>SEO, analytics, contact form</li>
                <li>Hosted by us on IONOS, never worry about it</li>
                <li>Same-day or next-day go-live</li>
                <li>Monthly care: updates, fixes, backups</li>
                <li>Cancel hosting anytime, you keep the site</li>
              </ul>
            </div>
          </div>

          <div className="pricing-card pricing-card-featured">
            <div className="pricing-badge">Most popular</div>
            <h3>Custom build</h3>
            <div className="pricing-tagline">
              <p>AI automation, MVP, web app, or internal tool.</p>
              <p>Scoped on a call, fixed price.</p>
            </div>
            <p className="price-point">from £750</p>
            <p className="price-suffix">one-off. Final quote within 24h of call.</p>
            <a href="https://cal.com/out-of-house.dev" target="_blank" rel="noopener noreferrer">
              <button><span>Scope a project</span></button>
            </a>
            <div className="pricing-details">
              <ul>
                <li>Scoped and quoted within 24 hours</li>
                <li>Often delivered same-week</li>
                <li>AI automation, prototype, internal tool, or MVP</li>
                <li>Integration with your tools and APIs</li>
                <li>You own the code and infrastructure</li>
                <li>Acceptance criteria signed off before completion</li>
                <li>30 days of post-launch fixes included</li>
              </ul>
            </div>
          </div>

          <div className="pricing-card">
            <h3>Monthly engagement</h3>
            <div className="pricing-tagline">
              <p>A senior team on tap for ongoing work.</p>
              <p>Pause anytime, no lock-in.</p>
            </div>
            <p className="price-point">from £1,500</p>
            <p className="price-suffix">/month, scaled to your scope</p>
            <a href="https://cal.com/out-of-house.dev" target="_blank" rel="noopener noreferrer">
              <button><span>Start engagement</span></button>
            </a>
            <div className="pricing-details">
              <ul>
                <li>Dedicated senior engineer + delivery lead</li>
                <li>Unlimited requests within scope</li>
                <li>Continuous shipping, typically 2 to 3 day cycles</li>
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
          {faq.map((q, index) => (
            <div
              key={q.question}
              className={`faq-item ${openFaqIndex === index ? 'open' : ''}`}
              onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
            >
              <div className="faq-title-container">
                <h3>{q.question}</h3>
                <span className="toggle-sign" aria-hidden="true">{openFaqIndex === index ? '−' : '+'}</span>
              </div>
              <p>{q.answer}</p>
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
              <div className="contact-subtitle">Book a call to scope your{' '}build</div>
            </div>
          </div>
          <div className="contact-us-mobile-cta">
            <a href="https://cal.com/out-of-house.dev" target="_blank" rel="noopener noreferrer">
              <button>Book a Call</button>
            </a>
          </div>
          <div className="contact-us-details">
            <div className="company-info">
              <h3 className="company-name">&#123;out-of-house.dev&#125;</h3>
              <p className="company-slogan">AI automations and software,<br />shipped at a pace others can't match.</p>
            </div>
            <div className="company-details">
              <p><strong>Email</strong></p>
              <p><a href="mailto:support@out-of-house.dev">support@out-of-house.dev</a></p>
              <p><strong>Phone</strong></p>
              <p><a href="tel:+447742952173">+44 07742 952173</a></p>
              <p><strong>Location</strong></p>
              <p>United Kingdom</p>
            </div>
            <div className="company-socials">
              <p><strong>Company</strong></p>
              <Link to="/developers" className="social-link">For Developers</Link>
              <Link to="/showcase"   className="social-link">Showcase</Link>
              <Link to="/changelog"  className="social-link">Changelog</Link>
              <Link to="/trust"      className="social-link">Trust &amp; Security</Link>
            </div>
          </div>
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
    </>
  );
};

const Check = ({ text, sub }) => (
  <div className="trust-item">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
    <div><strong>{text}</strong><span>{sub}</span></div>
  </div>
);

const HeaderGate = (props) => {
  const { pathname } = useLocation();
  const hide = pathname.startsWith('/app') ||
               pathname === '/login' ||
               pathname === '/apply' ||
               pathname === '/password-reset' ||
               pathname.startsWith('/auth/') ||
               pathname.startsWith('/verify/');
  if (hide) return null;
  return <Header {...props} />;
};

export default App;
