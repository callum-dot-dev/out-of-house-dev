// Fastify app factory. Exported separately from server.ts so tests build an app
// without binding a port. buildApp() does NOT touch the database or start the
// realtime bridge (server.ts / tests do that) so the plain /health check works
// with no DB configured.
import Fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { ZodError } from 'zod';
import { AppError } from './lib/errors';
import { isProd, isTest, optional, secret } from './lib/env';
import { CSRF_COOKIE, CSRF_HEADER } from './lib/cookies';
import { randomToken } from './lib/crypto';
import { stopRealtimeBridge } from './lib/realtime';
import { closePool } from './lib/db';
import authRoutes from './routes/auth';
import meRoutes from './routes/me';
import guestRoutes from './routes/guest';
import resourceRoutes from './routes/resources';
import fileRoutes from './routes/files';
import realtimeRoutes from './routes/realtime';
import collectRoutes from './routes/collect';
import adminRoutes from './routes/admin';

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// State-changing routes that legitimately can't carry a CSRF token: webhooks
// (signature-verified), public forms (captcha/honeypot), the analytics collector,
// and the unauthenticated auth entrypoints (login/register/magic/reset/guest).
const CSRF_EXEMPT: RegExp[] = [
  /^\/api\/v1\/health$/,
  /^\/api\/v1\/collect$/,
  /^\/api\/v1\/webhooks\//,
  /^\/api\/v1\/apply$/,
  /^\/api\/v1\/waitlist$/,
  /^\/api\/v1\/forms\//,
  /^\/api\/v1\/auth\/login$/,
  /^\/api\/v1\/auth\/register$/,
  /^\/api\/v1\/auth\/magic\/request$/,
  /^\/api\/v1\/auth\/magic\/consume$/,
  /^\/api\/v1\/auth\/password\/forgot$/,
  /^\/api\/v1\/auth\/password\/reset$/,
  /^\/api\/v1\/guest\/consume$/,
];

function loggerConfig(): boolean | Record<string, unknown> {
  if (isTest()) return false;
  if (isProd()) return { level: process.env.LOG_LEVEL ?? 'info' };
  return {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
  };
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: loggerConfig(), genReqId: () => randomUUID() });

  await app.register(cookie, { secret: secret('CSRF_SECRET') });

  const origins = Array.from(
    new Set([optional('PUBLIC_SITE_URL', 'http://localhost:3000'), 'http://localhost:3000']),
  );
  await app.register(cors, { origin: origins, credentials: true });
  await app.register(helmet, {
    contentSecurityPolicy: false, // API serves JSON; CSP lives on the web app
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  if (!isTest()) {
    await app.register(rateLimit, { max: 600, timeWindow: '1 minute' });
  }
  await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1 } });

  // CSRF: ensure an XSRF-TOKEN cookie exists, then double-submit verify on
  // unsafe, non-exempt routes.
  app.addHook('onRequest', async (req, reply) => {
    let csrf = req.cookies[CSRF_COOKIE];
    if (!csrf) {
      csrf = randomToken(24);
      reply.setCookie(CSRF_COOKIE, csrf, {
        secure: isProd(),
        sameSite: 'lax',
        path: '/',
        httpOnly: false,
        maxAge: 7 * 24 * 3600,
      });
    }
    if (UNSAFE.has(req.method)) {
      const path = req.url.split('?')[0];
      if (!CSRF_EXEMPT.some((re) => re.test(path))) {
        const header = req.headers[CSRF_HEADER];
        if (!header || header !== csrf) {
          return reply.code(403).send({ error: { code: 'csrf', message: 'CSRF token missing or invalid' } });
        }
      }
    }
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: { code: 'validation', message: 'Invalid input', details: err.flatten() } });
    }
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 400 && status < 500) {
      return reply.code(status).send({ error: { code: (err as { code?: string }).code ?? 'error', message: err.message } });
    }
    req.log.error(err);
    return reply.code(500).send({ error: { code: 'internal', message: 'Internal server error' } });
  });

  app.get('/api/v1/health', async () => ({ ok: true }));

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(meRoutes, { prefix: '/api/v1' });
  await app.register(guestRoutes, { prefix: '/api/v1' });
  await app.register(resourceRoutes, { prefix: '/api/v1' });
  await app.register(fileRoutes, { prefix: '/api/v1' });
  await app.register(realtimeRoutes, { prefix: '/api/v1' });
  await app.register(collectRoutes, { prefix: '/api/v1' });
  await app.register(adminRoutes, { prefix: '/api/v1' });

  app.addHook('onClose', async () => {
    await stopRealtimeBridge();
    await closePool();
  });

  return app;
}
