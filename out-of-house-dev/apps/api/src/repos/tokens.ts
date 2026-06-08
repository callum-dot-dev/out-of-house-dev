// auth_tokens (magic/reset/invite) + guest_tokens consumption. Raw tokens are
// never stored — only their sha256.
import { one } from '../lib/db';
import { sha256 } from '../lib/crypto';
import type { Role } from '../types';

export type AuthTokenPurpose = 'magic' | 'reset' | 'invite' | 'guest';

export async function createAuthToken(input: {
  purpose: AuthTokenPurpose;
  token: string;
  userId?: string | null;
  email?: string | null;
  role?: Role | null;
  ttlMs: number;
}): Promise<void> {
  const expires = new Date(Date.now() + input.ttlMs);
  await one(
    'insert into auth_tokens(purpose, token_hash, user_id, email, role, expires_at) values ($1,$2,$3,$4,$5,$6) returning id',
    [input.purpose, sha256(input.token), input.userId ?? null, input.email ?? null, input.role ?? null, expires],
  );
}

export type AuthTokenRow = {
  id: string;
  purpose: string;
  user_id: string | null;
  email: string | null;
  role: string | null;
  expires_at: string;
  used_at: string | null;
};

export async function consumeAuthToken(
  purpose: AuthTokenPurpose,
  token: string,
): Promise<AuthTokenRow | null> {
  const row = await one<AuthTokenRow>('select * from auth_tokens where purpose=$1 and token_hash=$2', [
    purpose,
    sha256(token),
  ]);
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  await one('update auth_tokens set used_at=now() where id=$1 returning id', [row.id]);
  return row;
}

export type GuestTokenRow = {
  token: string;
  scope_kind: 'request' | 'project' | 'preview';
  project_id: string | null;
  request_id: string | null;
  expires_at: string;
  revoked_at: string | null;
};

export async function consumeGuestToken(token: string): Promise<GuestTokenRow | null> {
  const row = await one<GuestTokenRow>('select * from guest_tokens where token=$1', [token]);
  if (!row) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}
