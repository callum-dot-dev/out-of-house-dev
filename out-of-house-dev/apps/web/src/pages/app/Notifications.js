import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthProvider';
import { fetchNotifications, markAllRead, markRead } from '../../lib/notifications';
import { useRealtimeTable } from '../../lib/realtime';
import { Skeleton, SkeletonBlock } from '../../components/Skeleton';

const formatRelative = (iso) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1)  return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7)  return `${day}d ago`;
  return d.toLocaleDateString();
};

const KIND_ICONS = {
  mention: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94" />
    </svg>
  ),
  project_status: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  ),
  default: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 01-3.4 0" />
    </svg>
  ),
};

const NotificationRow = ({ n, onOpen }) => {
  const icon = KIND_ICONS[n.kind] || KIND_ICONS.default;
  const content = (
    <>
      <div className={`notifs-row-icon ${n.read_at ? '' : 'is-unread'}`} aria-hidden="true">
        {icon}
      </div>
      <div className="notifs-row-body">
        <div className="notifs-row-title">
          {!n.read_at && <span className="notifs-row-unread-dot" aria-label="Unread" />}
          <strong>{n.title}</strong>
        </div>
        {n.body && <p className="notifs-row-text">{n.body}</p>}
        <span className="notifs-row-time">{formatRelative(n.created_at)}</span>
      </div>
      <span className="notifs-row-chev" aria-hidden="true">›</span>
    </>
  );

  const className = `notifs-row ${n.read_at ? '' : 'is-unread'}`;

  if (n.link) {
    return (
      <Link to={n.link} className={className} onClick={() => onOpen(n)}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={() => onOpen(n)}>
      {content}
    </button>
  );
};

const Notifications = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const list = await fetchNotifications(profile.id, { limit: 100, unreadOnly: filter === 'unread' });
    setItems(list);
    setLoading(false);
  }, [profile?.id, filter]);

  useEffect(() => { load(); }, [load]);

  useRealtimeTable({
    channel: profile?.id ? `notifs-page-${profile.id}` : null,
    table: 'notifications',
    filter: profile?.id ? `user_id=eq.${profile.id}` : undefined,
    onChange: () => load(),
  });

  const open = async (n) => {
    if (!n.read_at) {
      await markRead(n.id);
      setItems((xs) => xs.map((x) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
    }
  };

  const onMarkAll = async () => {
    setMarking(true);
    await markAllRead(profile?.id);
    setMarking(false);
    load();
  };

  const unreadCount = items.filter((n) => !n.read_at).length;

  return (
    <div className="app-page">
      <div className="app-page-head">
        <div>
          <div className="eyebrow">Notifications</div>
          <h1 className="app-h1">Everything that happened.</h1>
          <p className="app-lead">Mentions, status changes, comments. Newest first.</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" className="ghost-btn" onClick={onMarkAll} disabled={marking}>
            {marking ? 'Marking…' : `Mark all read (${unreadCount})`}
          </button>
        )}
      </div>

      <div className="filter-pills">
        {['all', 'unread'].map((f) => (
          <button key={f} className={`filter-pill ${filter === f ? 'is-active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="notifs-wrap">
        {loading ? (
          <div className="notifs-list-skeleton">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="notifs-row notifs-row-skeleton">
                <Skeleton w={32} h={32} r={16} />
                <div style={{ flex: 1 }}>
                  <Skeleton h={14} w="35%" />
                  <div style={{ height: 8 }} />
                  <SkeletonBlock rows={2} />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="notifs-empty">
            <div className="notifs-empty-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 01-3.4 0" />
              </svg>
            </div>
            <h3>All caught up.</h3>
            <p>When something happens on your projects, it'll show up here. We'll also email you unless you turn that off in settings.</p>
          </div>
        ) : (
          <div className="notifs-list">
            {items.map((n) => (
              <NotificationRow key={n.id} n={n} onOpen={open} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
