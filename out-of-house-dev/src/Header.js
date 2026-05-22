import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from './images/out-of-house-logo.png';
import { useAuth } from './lib/AuthProvider';
import { SERVICES as SERVICE_DATA } from './data/services';
import { COACHING_TRACKS } from './data/programmes';
import { SAAS_APPS } from './data/saasApps';
import './App.css';

const SERVICE_NAV = SERVICE_DATA.map((s) => ({
  slug: s.slug,
  title: s.title,
  flag: s.flag,
  caption: s.navCaption,
}));

const LEARN_NAV = [
  ...COACHING_TRACKS.map((t) => ({
    href: `/coaching/${t.slug}`,
    title: t.title,
    flag: t.flag,
    caption: t.navCaption,
  })),
  { href: '/courses', title: 'Cohort Courses', flag: 'New', caption: '3 / 6 / 12-week with certification' },
];

const PRODUCT_NAV = [
  ...SAAS_APPS.filter((a) => a.status === 'beta' || a.status === 'live').map((a) => ({
    href: `/saas/${a.slug}`,
    title: a.title,
    flag: a.flag,
    caption: a.navCaption,
  })),
  { href: '/saas', title: 'All SaaS / AIaaS', flag: null, caption: 'Browse every product' },
  { href: '/lead-engine', title: 'Lead Engine', flag: 'New', caption: 'Lead-gen-as-a-service' },
  { href: '/aiseo', title: 'AISEO', flag: 'New', caption: 'Be the brand AI recommends' },
];

const Header = ({ activeSection }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const servicesRef = useRef(null);
  const learnRef = useRef(null);
  const productsRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    mq.addListener?.(apply);
    return () => {
      mq.removeEventListener?.('change', apply);
      mq.removeListener?.(apply);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Outside click / Esc closes the open dropdown (desktop only — on mobile
  // they live inside the drawer, where clicks should not auto-close them).
  useEffect(() => {
    const anyOpen = servicesOpen || learnOpen || productsOpen;
    if (!anyOpen || isMobile) return undefined;
    const onMouseDown = (e) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target)) setServicesOpen(false);
      if (learnRef.current && !learnRef.current.contains(e.target)) setLearnOpen(false);
      if (productsRef.current && !productsRef.current.contains(e.target)) setProductsOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setServicesOpen(false);
        setLearnOpen(false);
        setProductsOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [servicesOpen, learnOpen, productsOpen, isMobile]);

  // Collapse all dropdowns whenever the drawer closes
  useEffect(() => {
    if (!menuOpen) {
      setServicesOpen(false);
      setLearnOpen(false);
      setProductsOpen(false);
    }
  }, [menuOpen]);

  const close = useCallback(() => {
    setMenuOpen(false);
    setServicesOpen(false);
    setLearnOpen(false);
    setProductsOpen(false);
  }, []);

  const toggleDropdown = (which) => {
    if (which === 'services') {
      setServicesOpen((v) => !v); setLearnOpen(false); setProductsOpen(false);
    } else if (which === 'learn') {
      setLearnOpen((v) => !v); setServicesOpen(false); setProductsOpen(false);
    } else if (which === 'products') {
      setProductsOpen((v) => !v); setServicesOpen(false); setLearnOpen(false);
    }
  };

  const goToSection = useCallback((sectionId) => {
    close();
    if (location.pathname !== '/') {
      try { sessionStorage.setItem('scrollToSection', sectionId); } catch { /* ignore */ }
      navigate('/');
      return;
    }
    const el = document.querySelector(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [close, location.pathname, navigate]);

  const toggleMenu = () => setMenuOpen((v) => !v);

  return (
    <header className={`App-header ${scrolled ? 'is-scrolled' : ''}`}>
      <nav className="App-nav">
        <Link to="/" className="logo" onClick={close}>
          <img src={logo} alt="out-of-house.dev" />
        </Link>
        <button
          type="button"
          className={`hamburger ${menuOpen ? 'is-open' : ''}`}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={toggleMenu}
        >
          <span className="bar" /><span className="bar" /><span className="bar" />
        </button>
        <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <li>
            <Link
              to="/"
              className={activeSection === 'home' && location.pathname === '/' ? 'active' : ''}
              onClick={close}
            >
              Home
            </Link>
          </li>
          <li className={`nav-services ${servicesOpen ? 'is-open' : ''}`} ref={servicesRef}>
            <button
              type="button"
              className={`nav-link-button nav-link-with-caret ${
                activeSection === 'services'
                || activeSection === 'capabilities'
                || location.pathname.startsWith('/services/')
                  ? 'active'
                  : ''
              }`}
              aria-expanded={servicesOpen}
              aria-haspopup="true"
              onClick={() => toggleDropdown('services')}
            >
              Services
              <svg
                className="nav-caret"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            <div className="nav-dropdown" role="menu" aria-label="Services">
              <div className="nav-dropdown-head">
                <span className="nav-dropdown-eyebrow">What we build</span>
              </div>
              <ul className="nav-dropdown-list">
                {SERVICE_NAV.map((item) => (
                  <li key={item.slug}>
                    <Link
                      to={`/services/${item.slug}`}
                      className={`nav-dropdown-item ${location.pathname === `/services/${item.slug}` ? 'is-current' : ''}`}
                      role="menuitem"
                      onClick={close}
                    >
                      <span className="nav-dropdown-item-row">
                        <span className="nav-dropdown-item-title">{item.title}</span>
                        {item.flag && (
                          <span className={`nav-dropdown-flag nav-dropdown-flag-${item.flag.toLowerCase()}`}>
                            {item.flag}
                          </span>
                        )}
                      </span>
                      {item.caption && (
                        <span className="nav-dropdown-item-caption">{item.caption}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="nav-dropdown-foot">
                <button
                  type="button"
                  className="nav-dropdown-foot-link"
                  role="menuitem"
                  onClick={() => goToSection('#capabilities')}
                >
                  See all AI capabilities
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </li>

          <li className={`nav-services ${learnOpen ? 'is-open' : ''}`} ref={learnRef}>
            <button
              type="button"
              className={`nav-link-button nav-link-with-caret ${
                location.pathname.startsWith('/coaching') || location.pathname.startsWith('/courses')
                  ? 'active'
                  : ''
              }`}
              aria-expanded={learnOpen}
              aria-haspopup="true"
              onClick={() => toggleDropdown('learn')}
            >
              Learn
              <svg className="nav-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            <div className="nav-dropdown" role="menu" aria-label="Learn">
              <div className="nav-dropdown-head">
                <span className="nav-dropdown-eyebrow">Coaching &amp; courses</span>
              </div>
              <ul className="nav-dropdown-list">
                {LEARN_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={`nav-dropdown-item ${location.pathname === item.href ? 'is-current' : ''}`}
                      role="menuitem"
                      onClick={close}
                    >
                      <span className="nav-dropdown-item-row">
                        <span className="nav-dropdown-item-title">{item.title}</span>
                        {item.flag && (
                          <span className={`nav-dropdown-flag nav-dropdown-flag-${item.flag.toLowerCase()}`}>
                            {item.flag}
                          </span>
                        )}
                      </span>
                      {item.caption && (
                        <span className="nav-dropdown-item-caption">{item.caption}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="nav-dropdown-foot">
                <Link to="/coaching" className="nav-dropdown-foot-link" role="menuitem" onClick={close}>
                  All coaching tracks
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </li>

          <li className={`nav-services ${productsOpen ? 'is-open' : ''}`} ref={productsRef}>
            <button
              type="button"
              className={`nav-link-button nav-link-with-caret ${
                location.pathname.startsWith('/saas') || location.pathname.startsWith('/lead-engine')
                  ? 'active'
                  : ''
              }`}
              aria-expanded={productsOpen}
              aria-haspopup="true"
              onClick={() => toggleDropdown('products')}
            >
              Products
              <svg className="nav-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            <div className="nav-dropdown" role="menu" aria-label="Products">
              <div className="nav-dropdown-head">
                <span className="nav-dropdown-eyebrow">SaaS &amp; AIaaS</span>
              </div>
              <ul className="nav-dropdown-list">
                {PRODUCT_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={`nav-dropdown-item ${location.pathname === item.href ? 'is-current' : ''}`}
                      role="menuitem"
                      onClick={close}
                    >
                      <span className="nav-dropdown-item-row">
                        <span className="nav-dropdown-item-title">{item.title}</span>
                        {item.flag && (
                          <span className={`nav-dropdown-flag nav-dropdown-flag-${item.flag.toLowerCase()}`}>
                            {item.flag}
                          </span>
                        )}
                      </span>
                      {item.caption && (
                        <span className="nav-dropdown-item-caption">{item.caption}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </li>

          <li>
            <button
              type="button"
              className={`nav-link-button ${activeSection === 'benefits' ? 'active' : ''}`}
              onClick={() => goToSection('#benefits')}
            >
              Why us
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-link-button ${activeSection === 'pricing' ? 'active' : ''}`}
              onClick={() => goToSection('#pricing')}
            >
              Pricing
            </button>
          </li>
          <li>
            <Link
              to="/developers"
              className={location.pathname === '/developers' ? 'active' : ''}
              onClick={close}
            >
              Developers
            </Link>
          </li>
          {isAuthenticated ? (
            <>
              <li>
                <Link
                  to="/app"
                  className={location.pathname.startsWith('/app') ? 'active' : ''}
                  onClick={close}
                >
                  Open app
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  className="nav-link-button"
                  onClick={() => { signOut(); close(); }}
                >
                  Sign out
                </button>
              </li>
            </>
          ) : (
            <li>
              <Link
                to="/login"
                className={location.pathname === '/login' ? 'active' : ''}
                onClick={close}
              >
                Sign in
              </Link>
            </li>
          )}
          {isMobile && (
            <li>
              <a
                href="https://cal.com/out-of-house.dev"
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
              >
                Book a call
              </a>
            </li>
          )}
        </ul>
        {!isMobile && (
          <a href="https://cal.com/out-of-house.dev" target="_blank" rel="noopener noreferrer" className="header-cta">
            <span className="contact-btn">Contact Us</span>
          </a>
        )}
      </nav>
    </header>
  );
};

export default Header;
