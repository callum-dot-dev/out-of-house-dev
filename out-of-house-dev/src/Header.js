import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from './images/out-of-house-logo.png';
import { useAuth } from './lib/AuthProvider';
import { SERVICES as SERVICE_DATA } from './data/services';
import './App.css';

const SERVICE_NAV = SERVICE_DATA.map((s) => ({
  slug: s.slug,
  title: s.title,
  flag: s.flag,
  caption: s.navCaption,
}));

const Header = ({ activeSection }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const servicesRef = useRef(null);

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

  // Outside click / Esc closes the Services dropdown (desktop only — on mobile
  // it lives inside the drawer, where clicks should not auto-close it).
  useEffect(() => {
    if (!servicesOpen || isMobile) return undefined;
    const onMouseDown = (e) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target)) {
        setServicesOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setServicesOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [servicesOpen, isMobile]);

  // Collapse the dropdown whenever the drawer closes
  useEffect(() => { if (!menuOpen) setServicesOpen(false); }, [menuOpen]);

  const close = useCallback(() => {
    setMenuOpen(false);
    setServicesOpen(false);
  }, []);

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
              onClick={() => setServicesOpen((v) => !v)}
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
