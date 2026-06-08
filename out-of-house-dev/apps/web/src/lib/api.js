// Platform API client. The app's data layer (Render API, cookie auth).
// - cookie auth (credentials: 'include'); CSRF double-submit header on writes
// - one transparent 401 -> /auth/refresh -> retry
// - typed-ish helpers (get/post/put/patch/del/upload) + an auth surface + useApi
import { useCallback, useEffect, useRef, useState } from 'react';

const BASE = (process.env.REACT_APP_API_URL || 'http://localhost:4000').replace(/\/$/, '');

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return m ? decodeURIComponent(m.split('=').slice(1).join('=')) : null;
}

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request(method, path, body, opts = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = {};
  if (body && !isForm) headers['content-type'] = 'application/json';
  if (method !== 'GET') {
    const csrf = readCookie('XSRF-TOKEN');
    if (csrf) headers['x-csrf-token'] = csrf;
  }
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  if (res.status === 401 && !opts._retried && path !== '/auth/refresh' && path !== '/auth/login') {
    const csrf = readCookie('XSRF-TOKEN');
    const r = await fetch(`${BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: csrf ? { 'x-csrf-token': csrf } : {},
    });
    if (r.ok) return request(method, path, body, { ...opts, _retried: true });
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(data?.error?.message || res.statusText, data?.error?.code, res.status);
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  patch: (p, b) => request('PATCH', p, b),
  del: (p) => request('DELETE', p),
  upload: (file, scope = 'attachments') => {
    const fd = new FormData();
    fd.append('file', file);
    return request('POST', `/files?scope=${encodeURIComponent(scope)}`, fd);
  },
  fileUrl: (path) => `${BASE}/api/v1/files/${path}`,
  base: BASE,
};

export const auth = {
  me: () => api.get('/me'),
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (payload) => api.post('/auth/register', payload),
  logout: () => api.post('/auth/logout', {}),
  magicRequest: (email) => api.post('/auth/magic/request', { email }),
  magicConsume: (token) => api.post('/auth/magic/consume', { token }),
  forgot: (email) => api.post('/auth/password/forgot', { email }),
  reset: (token, password) => api.post('/auth/password/reset', { token, password }),
  guestConsume: (token) => api.post('/guest/consume', { token }),
};

// Lightweight data hook: useApi(() => api.get('/projects'), [deps]) -> { data, loading, error, reload }
export function useApi(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fnRef.current());
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const d = await fnRef.current();
        if (alive) setData(d);
      } catch (e) {
        if (alive) setError(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload };
}
