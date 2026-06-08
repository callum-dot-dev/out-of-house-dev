import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole, viewerOf } from '../plugins/auth';
import { createApplication, getApplication, listApplications } from '../repos/applications';
import { approveApplication, rejectApplication } from '../services/applications';
import { uuidParam } from '../lib/http';
import { notFound } from '../lib/errors';

const PROJECT_TYPES = ['website', 'automation', 'web_app', 'custom_software', 'platform', 'maintenance', 'aiseo', 'lead_engine', 'other'] as const;

export default async function applicationRoutes(app: FastifyInstance): Promise<void> {
  app.post('/apply', async (req, reply) => {
    const b = z
      .object({
        full_name: z.string().min(1).max(200),
        email: z.string().email(),
        company: z.string().max(200).optional(),
        phone: z.string().max(40).optional(),
        project_type: z.enum(PROJECT_TYPES),
        project_description: z.string().min(10).max(5000),
        budget_range: z.string().max(80).optional(),
        timeline: z.string().max(80).optional(),
        source: z.string().max(120).optional(),
        website: z.string().optional(), // honeypot
      })
      .parse(req.body);
    if (b.website) return { ok: true }; // bot trap
    const row = await createApplication({ ...b, submitted_ip: req.ip, user_agent: req.headers['user-agent'] });
    return reply.code(201).send({ application_id: row.id });
  });

  app.get('/admin/applications', { preHandler: requireRole('admin', 'developer') }, async (req) => {
    const status = (req.query as { status?: string } | undefined)?.status;
    return { applications: await listApplications(status) };
  });

  app.get('/admin/applications/:id', { preHandler: requireRole('admin', 'developer') }, async (req) => {
    const row = await getApplication(uuidParam(req));
    if (!row) throw notFound();
    return { application: row };
  });

  app.post('/admin/applications/:id/approve', { preHandler: requireRole('admin') }, async (req) => {
    const result = await approveApplication(viewerOf(req), uuidParam(req));
    if (!result) throw notFound();
    return result;
  });

  app.post('/admin/applications/:id/reject', { preHandler: requireRole('admin') }, async (req) => {
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body ?? {});
    const ok = await rejectApplication(viewerOf(req), uuidParam(req), reason);
    if (!ok) throw notFound();
    return { ok: true };
  });
}
