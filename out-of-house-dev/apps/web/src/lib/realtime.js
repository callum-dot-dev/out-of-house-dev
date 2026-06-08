// Realtime, backed by the platform SSE endpoint (/api/v1/realtime).
// A single EventSource fans out to subscribers; on any event
// the consuming hook's onChange fires so the page re-fetches. Degrades to no-op
// where EventSource is unavailable (pages still have manual refresh).
import { useEffect, useRef } from 'react';
import { api } from './api';

let source = null;
const listeners = new Set();

function ensureSource() {
  if (source || typeof window === 'undefined' || typeof EventSource === 'undefined') return;
  try {
    source = new EventSource(`${api.base}/api/v1/realtime`, { withCredentials: true });
    const fire = (e) => {
      let data = {};
      try {
        data = JSON.parse(e.data);
      } catch {
        /* heartbeat / non-json */
      }
      listeners.forEach((l) => l(data, e.type));
    };
    source.addEventListener('notification', fire);
    source.onmessage = fire;
    source.onerror = () => {
      /* EventSource auto-reconnects */
    };
  } catch {
    source = null;
  }
}

function subscribe(cb) {
  ensureSource();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const useRealtimeTable = ({ onChange }) => {
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => subscribe(() => cb.current?.({ eventType: 'CHANGE' })), []);
};

export const useRealtimeMulti = ({ subscriptions = [] }) => {
  const subs = useRef(subscriptions);
  subs.current = subscriptions;
  useEffect(
    () =>
      subscribe(() => {
        subs.current.forEach((s) => s.onChange?.({ eventType: 'CHANGE' }));
      }),
    [],
  );
};
