// Short-lived HS256 access tokens implemented directly on node:crypto (no
// external JWT lib — keeps the CommonJS build free of ESM-only deps). Refresh
// tokens are opaque random strings tracked in `sessions` (services/auth.ts).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { secret } from './env';

export type AccessClaims = { sub: string; role: string; email: string };

export const ACCESS_TTL_SECONDS = 15 * 60;

const b64urlJson = (obj: unknown): string => Buffer.from(JSON.stringify(obj)).toString('base64url');

const signPart = (data: string): string =>
  createHmac('sha256', secret('SESSION_JWT_SECRET')).update(data).digest('base64url');

export async function signAccess(claims: AccessClaims): Promise<string> {
  const header = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const payload = b64urlJson({
    sub: claims.sub,
    role: claims.role,
    email: claims.email,
    iat: now,
    exp: now + ACCESS_TTL_SECONDS,
  });
  const data = `${header}.${payload}`;
  return `${data}.${signPart(data)}`;
}

export async function verifyAccess(token: string): Promise<AccessClaims | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = signPart(`${header}.${payload}`);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      sub: string;
      role: string;
      email: string;
      exp?: number;
    };
    if (typeof claims.exp === 'number' && claims.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: String(claims.sub), role: String(claims.role), email: String(claims.email) };
  } catch {
    return null;
  }
}
