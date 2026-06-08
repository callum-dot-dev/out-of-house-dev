// Session lifecycle: opaque rotating refresh tokens tracked in `sessions`, with
// refresh-token reuse detection (revoke the whole family) and a simple in-memory
// login lockout. Cookie setting lives in the routes; this module is pure logic.
import { one, query, tx } from '../lib/db';
import { randomToken, sha256 } from '../lib/crypto';

const REFRESH_TTL_MS = 30 * 24 * 3600 * 1000;

type SessionRow = {
  id: string;
  user_id: string;
  family_id: string;
  expires_at: string;
  revoked_at: string | null;
};

export async function createSession(
  userId: string,
  ua: string | undefined,
  ip: string | undefined,
): Promise<string> {
  const refreshToken = randomToken(32);
  const expires = new Date(Date.now() + REFRESH_TTL_MS);
  await one(
    'insert into sessions(user_id, refresh_hash, user_agent, ip, expires_at) values ($1,$2,$3,$4,$5) returning id',
    [userId, sha256(refreshToken), ua ?? null, ip ?? null, expires],
  );
  return refreshToken;
}

export type RotateResult =
  | { ok: true; userId: string; refreshToken: string }
  | { ok: false; reason: 'unknown' | 'expired' | 'reuse' };

export async function rotateSession(
  oldRefreshToken: string,
  ua: string | undefined,
  ip: string | undefined,
): Promise<RotateResult> {
  const session = await one<SessionRow>('select * from sessions where refresh_hash=$1', [
    sha256(oldRefreshToken),
  ]);
  if (!session) return { ok: false, reason: 'unknown' };

  if (session.revoked_at) {
    // A revoked token is being replayed → assume theft, revoke the whole family.
    await query('update sessions set revoked_at=now() where family_id=$1 and revoked_at is null', [
      session.family_id,
    ]);
    return { ok: false, reason: 'reuse' };
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  const newToken = randomToken(32);
  const expires = new Date(Date.now() + REFRESH_TTL_MS);
  await tx(async (c) => {
    await c.query('update sessions set revoked_at=now() where id=$1', [session.id]);
    await c.query(
      'insert into sessions(user_id, refresh_hash, family_id, user_agent, ip, expires_at) values ($1,$2,$3,$4,$5,$6)',
      [session.user_id, sha256(newToken), session.family_id, ua ?? null, ip ?? null, expires],
    );
  });
  return { ok: true, userId: session.user_id, refreshToken: newToken };
}

export async function revokeSessionByToken(refreshToken: string): Promise<void> {
  await query('update sessions set revoked_at=now() where refresh_hash=$1 and revoked_at is null', [
    sha256(refreshToken),
  ]);
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await query('update sessions set revoked_at=now() where user_id=$1 and revoked_at is null', [userId]);
}

// --- login lockout (in-memory; per-process is acceptable for now) -----------
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const LOCK_MAX = 10;
const attempts = new Map<string, { count: number; first: number }>();

export function isLockedOut(email: string): boolean {
  const a = attempts.get(email.toLowerCase());
  if (!a) return false;
  if (Date.now() - a.first > LOCK_WINDOW_MS) {
    attempts.delete(email.toLowerCase());
    return false;
  }
  return a.count >= LOCK_MAX;
}

export function recordFailure(email: string): void {
  const key = email.toLowerCase();
  const a = attempts.get(key);
  if (!a || Date.now() - a.first > LOCK_WINDOW_MS) {
    attempts.set(key, { count: 1, first: Date.now() });
  } else {
    a.count += 1;
  }
}

export function clearFailures(email: string): void {
  attempts.delete(email.toLowerCase());
}
