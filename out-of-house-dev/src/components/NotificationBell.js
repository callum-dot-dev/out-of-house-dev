import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthProvider';
import { fetchNotifications, markRead, markAllRead } from '../lib/notifications';
import { useRealtimeTable } from '../lib/realtime';

const formatRelative = (iso) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString();
};

const NotificationBell = () => {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    const list = await fetchNotifications(profile.id, { limit: 12 });
    setItems(list);
    setUnread(list.filter((n) => !n.read_at).length);
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  useRealtimeTable({
    channel: profile?.id ? `notifications-${profile.id}` : null,
    table: 'notifications',
    filter: profile?.id ? `user_id=eq.${profile.id}` : undefined,
    onChange: () => load(),
  });

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onItemClick = async (n) => {
    if (!n.read_at) await markRead(n.id);
    setOpen(false);
    load();
  };

  const onMarkAll = async () => {
    await markAllRead(profile?.id);
    load();
  };

  return (
    <div className="notif-wrap" ref={ref}>
      <button type="button" className="notif-bell" aria-label="Notifications" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 01-3.4 0" />
        </svg>
        {unread > 0 && <span className="notif-dot" aria-label={`${unread} unread`}>{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="menu">
          <div className="notif-head">
            <strong>Notifications</strong>
            {unread > 0 && <button type="button" className="notif-mark-all" onClick={onMarkAll}>Mark all read</button>}
          </div>
          {items.length === 0 ? (
            <div className="notif-empty">All caught up.</div>
          ) : (
            <ul className="notif-list">
              {items.map((n) => {
                const inner = (
                  <>
                    <div className="notif-row-title">
                      {!n.read_at && <span className="notif-row-unread" />}
                      <strong>{n.title}</strong>
                    </div>
                    {n.body && <p>{n.body}</p>}
                    <span className="notif-row-time">{formatRelative(n.created_at)}</span>
                  </>
                );
                return (
                  <li key={n.id} className={`notif-row ${n.read_at ? '' : 'is-unread'}`}>
                    {n.link
                      ? <Link to={n.link} onClick={() => onItemClick(n)}>{inner}</Link>
                      : <button type="button" onClick={() => onItemClick(n)}>{inner}</button>}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="notif-foot">
            <Link to="/app/notifications" onClick={() => setOpen(false)}>View all</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
