// Cookie names + options. In production we use the __Host- prefix (requires
// Secure + Path=/ + no Domain). In dev/test over http://localhost the prefix +
// Secure would be rejected, so we fall back to plain names. localhost:3000 and
// :4000 are the same site, so SameSite=Lax cookies are still sent on fetch.
import { isProd } from './env';

const prod = isProd();

export const AT_COOKIE = prod ? '__Host-ooh_at' : 'ooh_at';
export const RT_COOKIE = prod ? '__Host-ooh_rt' : 'ooh_rt';
export const CSRF_COOKIE = 'XSRF-TOKEN'; // readable by JS (double-submit)
export const CSRF_HEADER = 'x-csrf-token';

export type CookieOpts = {
  httpOnly?: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
};

export function authCookieOpts(maxAgeSeconds: number, httpOnly = true): CookieOpts {
  return {
    httpOnly,
    secure: prod,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export function clearCookieOpts(): CookieOpts {
  return { httpOnly: true, secure: prod, sameSite: 'lax', path: '/', maxAge: 0 };
}
