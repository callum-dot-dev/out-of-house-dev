import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthProvider';
import logo from '../../images/out-of-house-logo.png';

const CLIENT_NAV = [
  { to: '/app',            label: 'Dashboard',         icon: 'home',     end: true },
  { to: '/app/projects',   label: 'My Projects',       icon: 'folder' },
  { to: '/app/book',       label: 'Book a Call',       icon: 'calendar' },
  { to: '/app/settings',   label: 'Settings',          icon: 'cog' },
];

const DEV_NAV = [
  { to: '/app',            label: 'Dashboard',         icon: 'home',     end: true },
  { to: '/app/board',      label: 'Work Board',        icon: 'kanban' },
  { to: '/app/projects',   label: 'All Projects',      icon: 'folder' },
  { to: '/app/plans',      label: 'Plan Library',      icon: 'plan' },
  { to: '/app/settings',   label: 'Settings',          icon: 'cog' },
];

const ADMIN_NAV = [
  { to: '/app',                   label: 'Dashboard',     icon: 'home',     end: true },
  { to: '/app/admin/applications', label: 'Applications',  icon: 'inbox' },
  { to: '/app/admin/users',        label: 'Users',         icon: 'users' },
  { to: '/app/board',              label: 'Work Board',    icon: 'kanban' },
  { to: '/app/projects',           label: 'All Projects',  icon: 'folder' },
  { to: '/app/plans',              label: 'Plan Library',  icon: 'plan' },
  { to: '/app/settings',           label: 'Settings',      icon: 'cog' },
];

const Icon = ({ name }) => {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home':     return (<svg {...common}><path d="M3 12l9-9 9 9" /><path d="M5 10v10h14V10" /></svg>);
    case 'folder':   return (<svg {...common}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>);
    case 'calendar': return (<svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>);
    case 'cog':      return (<svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>);
    case 'kanban':   return (<svg {...common}><rect x="3" y="3" width="6" height="18" rx="1" /><rect x="11" y="3" width="6" height="12" rx="1" /><rect x="19" y="3" width="2" height="8" rx="1" /></svg>);
    case 'plan':     return (<svg {...common}><path d="M9 11l3 3 8-8" /><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" /></svg>);
    case 'inbox':    return (<svg {...common}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></svg>);
    case 'users':    return (<svg {...common}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>);
    default:         return null;
  }
};

const ProfileGate = () => {
  const { signOut, refreshProfile } = useAuth();
  const [showRescue, setShowRescue] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowRescue(true), 5000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="app-loader">
      <div className="app-loader-dot" />
      <div className="app-loader-text">Loading your profile…</div>
      {showRescue && (
        <div style={{ marginTop: 24, textAlign: 'center', maxWidth: 420, padding: '0 20px' }}>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
            Still loading. Your profile may not be set up yet, or the network is slow.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="ghost-btn" onClick={refreshProfile}>Retry</button>
            <button className="ghost-btn" onClick={signOut}>Sign out</button>
          </div>
        </div>
      )}
    </div>
  );
};

const AppShell = () => {
  const { profile, role, signOut, isAdmin, isDeveloper, isClient } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Authenticated but profile not yet loaded — show a dedicated loader so
  // child pages never have to defend against a null profile.
  if (!profile) return <ProfileGate />;

  const nav = isAdmin ? ADMIN_NAV : isDeveloper ? DEV_NAV : CLIENT_NAV;

  const roleLabel = isAdmin ? 'Admin' : isDeveloper ? 'Developer' : isClient ? 'Client' : 'Member';
  const initials = (profile?.full_name || profile?.email || '?').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();

  return (
    <div className={`app-shell ${mobileOpen ? 'is-open' : ''}`}>
      <aside className="app-sidebar">
        <Link to="/" className="app-sidebar-logo">
          <img src={logo} alt="" />
        </Link>
        <nav className="app-nav">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `app-nav-link ${isActive ? 'is-active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="app-sidebar-foot">
          <Link to="/" className="app-nav-link">← Back to site</Link>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <button
            className="app-mobile-toggle"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle navigation"
          >
            <span /><span /><span />
          </button>
          <div className="app-topbar-spacer" />
          <div className="app-user">
            <div className="app-user-meta">
              <div className="app-user-name">{profile?.full_name || profile?.email || 'You'}</div>
              <div className="app-user-role">{roleLabel}{profile?.company ? ` · ${profile.company}` : ''}</div>
            </div>
            <div className="app-user-avatar">{initials}</div>
            <button className="app-signout" onClick={signOut} title="Sign out">Sign out</button>
          </div>
        </header>

        <main className="app-content">
          <Outlet context={{ role }} />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
