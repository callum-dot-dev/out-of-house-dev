// Fastify app factory. Exported separately from server.ts so tests can build an
// app instance without binding a port. Phase 2 registers helmet/cors/cookie/
// rate-limit/multipart plugins, auth, and the route tree here.
import Fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

function loggerConfig(): boolean | Record<string, unknown> {
  if (process.env.NODE_ENV === 'test') return false;
  if (process.env.NODE_ENV === 'production') return { level: process.env.LOG_LEVEL ?? 'info' };
  return {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
  };
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: loggerConfig(),
    genReqId: () => randomUUID(),
    disableRequestLogging: false,
  });

  // Health check — kept dependency-free so it stays green even when integrations
  // are down. Render uses /api/v1/health as the service healthCheckPath.
  app.get('/api/v1/health', async () => ({ ok: true }));

  return app;
}
