import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { attachViewer } from '../plugins/auth';
import { runAiseoAudit } from '../services/aiseoAudit';
import { query } from '../lib/db';

export default async function aiseoRoutes(app: FastifyInstance): Promise<void> {
  app.post('/aiseo/audit', { preHandler: attachViewer }, async (req) => {
    const b = z.object({ domain: z.string().min(3).max(255) }).parse(req.body);
    const result = await runAiseoAudit(b.domain, req.viewer?.id ?? null);
    await query('insert into analytics_events(name, props) values ($1,$2)', [
      'funnel.audit_completed',
      JSON.stringify({ domain: result.domain, grade: result.grade, score: result.score }),
    ]);
    return result;
  });
}
