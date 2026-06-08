import type { FastifyInstance } from 'fastify';
import { requireRole } from '../plugins/auth';
import { uuidParam } from '../lib/http';
import { getPlanTemplate, listChangelog, listPlanTemplates, listProgrammes, listSaasApps } from '../repos/catalog';
import { notFound } from '../lib/errors';

export default async function catalogRoutes(app: FastifyInstance): Promise<void> {
  // Plan templates carry build handoffs → staff only.
  app.get('/plan-templates', { preHandler: requireRole('admin', 'developer') }, async () => ({
    templates: await listPlanTemplates(),
  }));
  app.get('/plan-templates/:id', { preHandler: requireRole('admin', 'developer') }, async (req) => {
    const t = await getPlanTemplate(uuidParam(req));
    if (!t) throw notFound();
    return { template: t };
  });

  // Public catalogue surfaces.
  app.get('/programmes', async () => ({ programmes: await listProgrammes() }));
  app.get('/saas-apps', async () => ({ apps: await listSaasApps() }));
  app.get('/changelog', async () => ({ entries: await listChangelog() }));
}
