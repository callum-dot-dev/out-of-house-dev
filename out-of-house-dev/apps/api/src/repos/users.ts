import { one } from '../lib/db';
import type { Role } from '../types';

export type UserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  full_name: string | null;
  company: string | null;
  role: Role;
  avatar_path: string | null;
  notify_email: boolean;
  notify_in_app: boolean;
  timezone: string | null;
  terms_accepted_at: string | null;
};

const COLS =
  'id, email, password_hash, full_name, company, role, avatar_path, notify_email, notify_in_app, timezone, terms_accepted_at';

export const getUserByEmail = (email: string): Promise<UserRow | null> =>
  one<UserRow>(`select ${COLS} from users where email=$1 and deleted_at is null`, [email]);

export const getUserById = (id: string): Promise<UserRow | null> =>
  one<UserRow>(`select ${COLS} from users where id=$1 and deleted_at is null`, [id]);

export async function countUsers(): Promise<number> {
  const row = await one<{ n: number }>('select count(*)::int as n from users');
  return row?.n ?? 0;
}

export async function createUser(input: {
  email: string;
  password_hash: string | null;
  full_name?: string | null;
  role: Role;
  company?: string | null;
}): Promise<UserRow> {
  const row = await one<UserRow>(
    `insert into users(email, password_hash, full_name, role, company)
       values ($1,$2,$3,$4,$5)
     returning ${COLS}`,
    [input.email, input.password_hash, input.full_name ?? null, input.role, input.company ?? null],
  );
  return row as UserRow;
}

export async function setPassword(userId: string, passwordHash: string): Promise<void> {
  await one('update users set password_hash=$2 where id=$1 returning id', [userId, passwordHash]);
}

export async function touchLogin(userId: string): Promise<void> {
  await one('update users set last_login_at=now(), last_seen_at=now() where id=$1 returning id', [userId]);
}

/** Shape returned to clients — never includes the password hash. */
export function publicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    company: u.company,
    role: u.role,
    avatar_path: u.avatar_path,
    notify_email: u.notify_email,
    notify_in_app: u.notify_in_app,
    timezone: u.timezone,
    terms_accepted_at: u.terms_accepted_at,
  };
}
