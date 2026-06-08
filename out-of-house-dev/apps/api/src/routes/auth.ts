import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  countUsers,
  createUser,
  getUserByEmail,
  getUserById,
  publicUser,
  setPassword,
  touchLogin,
  type UserRow,
} from '../repos/users';
import { consumeAuthToken, createAuthToken } from '../repos/tokens';
import {
  clearFailures,
  createSession,
  isLockedOut,
  recordFailure,
  revokeAllUserSessions,
  revokeSessionByToken,
  rotateSession,
} from '../services/auth';
import { queueEmail } from '../services/email';
import { audit } from '../services/audit';
import { hashPassword, randomToken, verifyPassword } from '../lib/crypto';
import { signAccess, ACCESS_TTL_SECONDS } from '../lib/jwt';
import { AT_COOKIE, RT_COOKIE, authCookieOpts, clearCookieOpts } from '../lib/cookies';
import { badRequest, conflict, forbidden, tooMany, unauthorized } from '../lib/errors';
import { siteUrl } from '../lib/http';
import type { Role } from '../types';

const REFRESH_TTL_SECONDS = 30 * 24 * 3600;

async function startSession(req: FastifyRequest, reply: FastifyReply, user: UserRow): Promise<void> {
  const refresh = await createSession(user.id, req.headers['user-agent'], req.ip);
  const access = await signAccess({ sub: user.id, role: user.role, email: user.email });
  reply.setCookie(AT_COOKIE, access, authCookieOpts(ACCESS_TTL_SECONDS));
  reply.setCookie(RT_COOKIE, refresh, authCookieOpts(REFRESH_TTL_SECONDS));
}

function clearSession(reply: FastifyReply): void {
  reply.setCookie(AT_COOKIE, '', clearCookieOpts());
  reply.setCookie(RT_COOKIE, '', clearCookieOpts());
}

const emailSchema = z.object({ email: z.string().email() });

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/register', async (req, reply) => {
    const b = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        full_name: z.string().optional(),
        inviteToken: z.string().optional(),
      })
      .parse(req.body);

    if (await getUserByEmail(b.email)) throw conflict('Email already registered', 'email_taken');

    let role: Role = 'client';
    if ((await countUsers()) === 0) {
      role = 'admin'; // first-admin bootstrap
    } else {
      if (!b.inviteToken) throw forbidden('Registration is invite-only', 'invite_required');
      const tok = await consumeAuthToken('invite', b.inviteToken);
      if (!tok) throw badRequest('Invalid or expired invite', 'invalid_invite');
      if (tok.email && tok.email.toLowerCase() !== b.email.toLowerCase())
        throw badRequest('Invite email mismatch', 'invite_mismatch');
      role = (tok.role as Role) ?? 'client';
    }

    const user = await createUser({
      email: b.email,
      password_hash: await hashPassword(b.password),
      full_name: b.full_name ?? null,
      role,
    });
    await startSession(req, reply, user);
    await audit({ id: user.id, role: user.role, email: user.email }, 'auth.register', { table: 'users', id: user.id }, { role }, req.ip);
    return reply.code(201).send({ user: publicUser(user) });
  });

  app.post('/login', async (req, reply) => {
    const b = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    if (isLockedOut(b.email)) throw tooMany('Too many attempts, try again later', 'locked_out');

    const user = await getUserByEmail(b.email);
    const ok = user?.password_hash ? await verifyPassword(user.password_hash, b.password) : false;
    if (!user || !ok) {
      recordFailure(b.email);
      throw unauthorized('Invalid credentials', 'invalid_credentials');
    }
    clearFailures(b.email);
    await touchLogin(user.id);
    await startSession(req, reply, user);
    return { user: publicUser(user) };
  });

  app.post('/logout', async (req, reply) => {
    const rt = req.cookies[RT_COOKIE];
    if (rt) await revokeSessionByToken(rt);
    clearSession(reply);
    return { ok: true };
  });

  app.post('/refresh', async (req, reply) => {
    const rt = req.cookies[RT_COOKIE];
    if (!rt) throw unauthorized('No refresh token', 'no_refresh');
    const result = await rotateSession(rt, req.headers['user-agent'], req.ip);
    if (!result.ok) {
      clearSession(reply);
      throw unauthorized('Session invalid', result.reason === 'reuse' ? 'token_reuse' : 'refresh_failed');
    }
    const user = await getUserById(result.userId);
    if (!user) throw unauthorized();
    const access = await signAccess({ sub: user.id, role: user.role, email: user.email });
    reply.setCookie(AT_COOKIE, access, authCookieOpts(ACCESS_TTL_SECONDS));
    reply.setCookie(RT_COOKIE, result.refreshToken, authCookieOpts(REFRESH_TTL_SECONDS));
    return { user: publicUser(user) };
  });

  app.post('/magic/request', async (req) => {
    const { email } = emailSchema.parse(req.body);
    const user = await getUserByEmail(email);
    if (user) {
      const token = randomToken(32);
      await createAuthToken({ purpose: 'magic', token, userId: user.id, email, ttlMs: 15 * 60 * 1000 });
      const link = `${siteUrl()}/auth/callback?mode=magic&token=${token}`;
      await queueEmail({ to: email, template: 'magic-link', subject: 'Your sign-in link', text: `Sign in: ${link}`, meta: { token } });
    }
    return { ok: true }; // never reveal whether the account exists
  });

  app.post('/magic/consume', async (req, reply) => {
    const { token } = z.object({ token: z.string() }).parse(req.body);
    const row = await consumeAuthToken('magic', token);
    if (!row?.email) throw badRequest('Invalid or expired link', 'invalid_token');
    const user = await getUserByEmail(row.email);
    if (!user) throw badRequest('Invalid link', 'invalid_token');
    await touchLogin(user.id);
    await startSession(req, reply, user);
    return { user: publicUser(user) };
  });

  app.post('/password/forgot', async (req) => {
    const { email } = emailSchema.parse(req.body);
    const user = await getUserByEmail(email);
    if (user) {
      const token = randomToken(32);
      await createAuthToken({ purpose: 'reset', token, userId: user.id, email, ttlMs: 60 * 60 * 1000 });
      const link = `${siteUrl()}/auth/callback?mode=reset&token=${token}`;
      await queueEmail({ to: email, template: 'password-reset', subject: 'Reset your password', text: `Reset: ${link}`, meta: { token } });
    }
    return { ok: true };
  });

  app.post('/password/reset', async (req) => {
    const b = z.object({ token: z.string(), password: z.string().min(8) }).parse(req.body);
    const row = await consumeAuthToken('reset', b.token);
    if (!row?.user_id) throw badRequest('Invalid or expired token', 'invalid_token');
    await setPassword(row.user_id, await hashPassword(b.password));
    await revokeAllUserSessions(row.user_id); // force re-login everywhere
    return { ok: true };
  });
}
