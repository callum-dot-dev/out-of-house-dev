import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from './images/out-of-house-logo.png';
import { useAuth } from './lib/AuthProvider';
import { SERVICES as SERVICE_DATA } from './data/services';
import { COACHING_TRACKS } from './data/programmes';
import { SAAS_APPS } from './data/saasApps';
import './App.css';

// Simplified IA (ADR 0005): five top-level items — Build · Learn · Products ·
// Pricing · Company — plus utility (sign-in / book-a-call). "Home" is dropped
// (the logo is home); "Why us" is a homepage section reached by scrolling;
// Developers / Showcase / Changelog / Trust are consolidated under Company.

const BUILD_NAV = SERVICE_DATA.map((s) => ({
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

const COMPANY_NAV = [
  { href: '/developers', title: 'For developers', flag: null, caption: 'Paid trial work on our bench' },
  { href: '/showcase', title: 'Showcase', flag: null, caption: 'What we’ve shipped' },
  { href: '/changelog', title: 'Changelog', flag: null, caption: 'Public build notes' },
  { href: '/trust', title: 'Trust & security', flag: null, caption: 'How we look after your data' },
];

// A reusable dropdown so all four menus share one accessible implementation.
const NavDropdown = ({
  id, label, eyebrow, items, isOpen, onToggle, dropdownRef, activeMatch, onItemClick, foot,
}) => (
  <li className={`nav-services ${isOpen ? 'is-open' : ''}`} ref={dropdownRef}>
    <button
      type="button"
      className={`nav-link-button nav-link-with-caret ${activeMatch ? 'active' : ''}`}
      aria-expanded={isOpen}
      aria-haspopup="true"
      onClick={() => onToggle(id)}
    >
      {label}
      <svg className="nav-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <div className="nav-dropdown" role="menu" aria-label={label}>
      <div className="nav-dropdown-head">
        <span className="nav-dropdown-eyebrow">{eyebrow}</span>
      </div>
      <ul className="nav-dropdown-list">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              to={item.href}
              className={`nav-dropdown-item ${item.current ? 'is-current' : ''}`}
              role="menuitem"
              onClick={onItemClick}
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
      {foot}
    </div>
  </li>
);

const Header = ({ activeSection }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState(null); // 'build' | 'learn' | 'products' | 'company' | null
  const buildRef = useRef(null);
  const learnRef = useRef(null);
  const productsRef = useRef(null);
  const companyRef = useRef(null);

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

  // Outside click / Esc closes the open dropdown (desktop only — on mobile they
  // live inside the drawer, where clicks should not auto-close them).
  useEffect(() => {
    if (!openMenu || isMobile) return undefined;
    const refs = { build: buildRef, learn: learnRef, products: productsRef, company: companyRef };
    const current = refs[openMenu];
    const onMouseDown = (e) => {
      if (current?.current && !current.current.contains(e.target)) setOpenMenu(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpenMenu(null); };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenu, isMobile]);

  // Collapse dropdowns whenever the drawer closes.
  useEffect(() => { if (!menuOpen) setOpenMenu(null); }, [menuOpen]);

  const close = useCallback(() => {
    setMenuOpen(false);
    setOpenMenu(null);
  }, []);

  const toggleDropdown = (which) => setOpenMenu((cur) => (cur === which ? null : which));

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

  const path = location.pathname;
  const buildItems = BUILD_NAV.map((i) => ({ ...i, href: `/services/${i.slug}`, current: path === `/services/${i.slug}` }));
  const learnItems = LEARN_NAV.map((i) => ({ ...i, current: path === i.href }));
  const productItems = PRODUCT_NAV.map((i) => ({ ...i, current: path === i.href }));
  const companyItems = COMPANY_NAV.map((i) => ({ ...i, current: path === i.href }));

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
          <NavDropdown
            id="build"
            label="Build"
            eyebrow="What we build"
            items={buildItems}
            isOpen={openMenu === 'build'}
            onToggle={toggleDropdown}
            dropdownRef={buildRef}
            activeMatch={activeSection === 'services' || activeSection === 'capabilities' || path.startsWith('/services/')}
            onItemClick={close}
            foot={(
              <div className="nav-dropdown-foot">
                <button type="button" className="nav-dropdown-foot-link" role="menuitem" onClick={() => goToSection('#capabilities')}>
                  See all AI capabilities
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          />

          <NavDropdown
            id="learn"
            label="Learn"
            eyebrow="Coaching & courses"
            items={learnItems}
            isOpen={openMenu === 'learn'}
            onToggle={toggleDropdown}
            dropdownRef={learnRef}
            activeMatch={path.startsWith('/coaching') || path.startsWith('/courses')}
            onItemClick={close}
            foot={(
              <div className="nav-dropdown-foot">
                <Link to="/coaching" className="nav-dropdown-foot-link" role="menuitem" onClick={close}>
                  All coaching tracks
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}
          />

          <NavDropdown
            id="products"
            label="Products"
            eyebrow="SaaS & AIaaS"
            items={productItems}
            isOpen={openMenu === 'products'}
            onToggle={toggleDropdown}
            dropdownRef={productsRef}
            activeMatch={path.startsWith('/saas') || path.startsWith('/lead-engine') || path.startsWith('/aiseo')}
            onItemClick={close}
          />

          <li>
            <button
              type="button"
              className={`nav-link-button ${activeSection === 'pricing' ? 'active' : ''}`}
              onClick={() => goToSection('#pricing')}
            >
              Pricing
            </button>
          </li>

          <NavDropdown
            id="company"
            label="Company"
            eyebrow="The studio"
            items={companyItems}
            isOpen={openMenu === 'company'}
            onToggle={toggleDropdown}
            dropdownRef={companyRef}
            activeMatch={['/developers', '/showcase', '/changelog', '/trust', '/subprocessors'].includes(path)}
            onItemClick={close}
          />

          {isAuthenticated ? (
            <>
              <li>
                <Link
                  to="/app"
                  className={path.startsWith('/app') ? 'active' : ''}
                  onClick={close}
                >
                  Open app
                </Link>
              </li>
              <li>
                <button type="button" className="nav-link-button" onClick={() => { signOut(); close(); }}>
                  Sign out
                </button>
              </li>
            </>
          ) : (
            <li>
              <Link to="/login" className={path === '/login' ? 'active' : ''} onClick={close}>
                Sign in
              </Link>
            </li>
          )}
          {isMobile && (
            <li>
              <a href="https://cal.eu/out-of-house.dev" target="_blank" rel="noopener noreferrer" onClick={close}>
                Book a call
              </a>
            </li>
          )}
        </ul>
        {!isMobile && (
          <a href="https://cal.eu/out-of-house.dev" target="_blank" rel="noopener noreferrer" className="header-cta">
            <span className="contact-btn">Contact Us</span>
          </a>
        )}
      </nav>
    </header>
  );
};

export default Header;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          