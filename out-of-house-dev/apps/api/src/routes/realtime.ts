import type { FastifyInstance } from 'fastify';
import { requireAuth, viewerOf } from '../plugins/auth';
import { onUserEvent } from '../lib/realtime';

export default async function realtimeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/realtime', { preHandler: requireAuth }, async (req, reply) => {
    const v = viewerOf(req);
    reply.hijack(); // take over the raw socket for SSE
    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    reply.raw.write('event: ready\ndata: {}\n\n');

    const off = onUserEvent(v.id, (payload) => {
      reply.raw.write(`event: ${String(payload.type ?? 'message')}\ndata: ${JSON.stringify(payload)}\n\n`);
    });
    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(': ping\n\n');
      } catch {
        /* socket closed */
      }
    }, 25_000);

    req.raw.on('close', () => {
      clearInterval(heartbeat);
      off();
    });
  });
}
