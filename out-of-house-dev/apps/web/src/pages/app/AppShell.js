import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthProvider';
import logo from '../../images/out-of-house-logo.png';
import NotificationBell from '../../components/NotificationBell';

const CLIENT_NAV = [
  { to: '/app',               label: 'Dashboard',     icon: 'home',     end: true },
  { to: '/app/projects',      label: 'My projects',   icon: 'folder' },
  { to: '/app/documents',     label: 'Document Room', icon: 'docs' },
  { to: '/app/notifications', label: 'Notifications', icon: 'bell' },
  { to: '/app/billing',       label: 'Billing',       icon: 'card' },
  { to: '/app/book',          label: 'Book a call',   icon: 'calendar' },
  { to: '/app/settings',      label: 'Settings',      icon: 'cog' },
];

const DEV_NAV = [
  { to: '/app',               label: 'Dashboard',     icon: 'home',     end: true },
  { to: '/app/board',         label: 'Work board',    icon: 'kanban' },
  { to: '/app/projects',      label: 'Projects',      icon: 'folder' },
  { to: '/app/documents',     label: 'Document Room', icon: 'docs' },
  { to: '/app/plans',         label: 'Plan library',  icon: 'plan' },
  { to: '/app/notifications', label: 'Notifications', icon: 'bell' },
  { to: '/app/settings',      label: 'Settings',      icon: 'cog' },
];

const ADMIN_NAV = [
  { to: '/app',                    label: 'Dashboard',    icon: 'home',     end: true },
  { to: '/app/admin/applications', label: 'Applications', icon: 'inbox' },
  { to: '/app/admin/users',        label: 'Users',        icon: 'users' },
  { to: '/app/admin/audit',        label: 'Audit log',    icon: 'shield' },
  { to: '/app/board',              label: 'Work board',   icon: 'kanban' },
  { to: '/app/projects',           label: 'Projects',     icon: 'folder' },
  { to: '/app/documents',          label: 'Documents',    icon: 'docs' },
  { to: '/app/plans',              label: 'Plans',        icon: 'plan' },
  { to: '/app/notifications',      label: 'Notifications', icon: 'bell' },
  { to: '/app/settings',           label: 'Settings',     icon: 'cog' },
];

const Icon = ({ name }) => {
  const c = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home':     return (<svg {...c}><path d="M3 12l9-9 9 9" /><path d="M5 10v10h14V10" /></svg>);
    case 'folder':   return (<svg {...c}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>);
    case 'calendar': return (<svg {...c}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>);
    case 'cog':      return (<svg {...c}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>);
    case 'kanban':   return (<svg {...c}><rect x="3" y="3" width="6" height="18" rx="1" /><rect x="11" y="3" width="6" height="12" rx="1" /><rect x="19" y="3" width="2" height="8" rx="1" /></svg>);
    case 'plan':     return (<svg {...c}><path d="M9 11l3 3 8-8" /><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" /></svg>);
    case 'inbox':    return (<svg {...c}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></svg>);
    case 'users':    return (<svg {...c}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>);
    case 'bell':     return (<svg {...c}><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>);
    case 'card':     return (<svg {...c}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>);
    case 'shield':   return (<svg {...c}><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" /></svg>);
    case 'docs':     return (<svg {...c}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>);
    default:         return null;
  }
};

const ProfileGate = () => {
  const { signOut, refreshProfile } = useAuth();
  const [stage, setStage] = useState('boot');

  useEffect(() => {
    const a = setTimeout(() => setStage('hint'), 1500);
    const b = setTimeout(() => setStage('rescue'), 5000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  return (
    <div className="app-loader" role="status" aria-live="polite">
      <div className="app-loader-skeleton">
        <div className="app-loader-skeleton-side">
          <div className="app-loader-skeleton-logo" />
          <div className="app-loader-skeleton-nav">
            <div /><div /><div /><div />
          </div>
        </div>
        <div className="app-loader-skeleton-main">
          <div className="app-loader-skeleton-head" />
          <div className="app-loader-skeleton-body" />
        </div>
      </div>
      {stage !== 'boot' && (
        <div className="app-loader-message">
          <span className="app-loader-dots"><span /><span /><span /></span>
          <span>Loading your profile…</span>
        </div>
      )}
      {stage === 'rescue' && (
        <div className="app-loader-rescue">
          <p>Still working on it. Profile might not be set up yet, or the network is slow.</p>
          <div className="app-loader-rescue-actions">
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

  if (!profile) return <ProfileGate />;

  const nav = isAdmin ? ADMIN_NAV : isDeveloper ? DEV_NAV : CLIENT_NAV;
  const roleLabel = isAdmin ? 'Admin' : isDeveloper ? 'Developer' : isClient ? 'Client' : 'Member';
  const initials = (profile?.full_name || profile?.email || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className={`app-shell ${mobileOpen ? 'is-open' : ''}`}>
      <aside className="app-sidebar">
        <Link to="/" className="app-sidebar-logo">
          <img src={logo} alt="" />
        </Link>
        <nav className="app-nav">
          {nav.map((item) => (
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
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            <span /><span /><span />
          </button>
          <div className="app-topbar-spacer" />
          <NotificationBell />
          <div className="app-user">
            <div className="app-user-meta">
              <div className="app-user-name">{profile?.full_name || profile?.email || 'You'}</div>
              <div className="app-user-role">{roleLabel}{profile?.company ? ` · ${profile.company}` : ''}</div>
            </div>
            <div className="app-user-avatar" aria-hidden="true">{initials}</div>
            <button className="app-signout" onClick={signOut} title="Sign out" type="button">Sign out</button>
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
