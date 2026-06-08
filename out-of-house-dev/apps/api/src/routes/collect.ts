// First-party analytics collector — public, no cookies/PII; session_id is
// generated client-side. Rate-limited at the app level.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { attachViewer } from '../plugins/auth';
import { query } from '../lib/db';

export default async function collectRoutes(app: FastifyInstance): Promise<void> {
  app.post('/collect', { preHandler: attachViewer }, async (req) => {
    const b = z
      .object({
        session_id: z.string().max(64).optional(),
        name: z.string().max(120),
        path: z.string().max(512).optional(),
        props: z.record(z.unknown()).optional(),
      })
      .parse(req.body);

    await query(
      'insert into analytics_events(session_id, user_id, name, path, props) values ($1,$2,$3,$4,$5)',
      [b.session_id ?? null, req.viewer?.id ?? null, b.name, b.path ?? null, JSON.stringify(b.props ?? {})],
    );
    return { ok: true };
  });
}
