import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

let externalAdd = null;

export const toast = {
  success: (msg, opts) => externalAdd?.({ kind: 'success', msg, ...opts }),
  error:   (msg, opts) => externalAdd?.({ kind: 'error',   msg, ...opts }),
  info:    (msg, opts) => externalAdd?.({ kind: 'info',    msg, ...opts }),
  warn:    (msg, opts) => externalAdd?.({ kind: 'warning', msg, ...opts }),
};

export const ToastProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setItems(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 220);
  }, []);

  const add = useCallback(({ kind = 'info', msg, duration = 4200, action }) => {
    const id = ++idRef.current;
    setItems(prev => [...prev, { id, kind, msg, action, leaving: false }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  useEffect(() => {
    externalAdd = add;
    return () => { externalAdd = null; };
  }, [add]);

  const value = useMemo(() => ({ add, dismiss }), [add, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="region" aria-live="polite" aria-atomic="false">
        {items.map(t => (
          <div key={t.id} className={`toast toast-${t.kind} ${t.leaving ? 'is-leaving' : ''}`}>
            <ToastIcon kind={t.kind} />
            <div className="toast-body">{t.msg}</div>
            {t.action && (
              <button type="button" className="toast-action" onClick={() => { t.action.onClick?.(); dismiss(t.id); }}>
                {t.action.label}
              </button>
            )}
            <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastIcon = ({ kind }) => {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (kind) {
    case 'success': return (<svg {...common}><path d="M20 6L9 17l-5-5" /></svg>);
    case 'error':   return (<svg {...common}><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></svg>);
    case 'warning': return (<svg {...common}><path d="M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4M12 17h.01" /></svg>);
    default:        return (<svg {...common}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>);
  }
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) return toast;
  return ctx;
};
