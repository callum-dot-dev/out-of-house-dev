import type { FastifyInstance } from 'fastify';
import { requireRole } from '../plugins/auth';
import { query } from '../lib/db';
import { EMAIL_DRY_RUN, integrationStatus } from '../lib/env';
import { fileStore } from '../lib/filestore';

export default async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.get('/admin/health', { preHandler: requireRole('admin') }, async () => {
    let db: 'ok' | 'error' = 'ok';
    try {
      await query('select 1');
    } catch {
      db = 'error';
    }
    return {
      ok: db === 'ok',
      db,
      email_dry_run: EMAIL_DRY_RUN(),
      integrations: integrationStatus(),
      queues: {}, // pg-boss queue depths wired in Phase 4
      storage: { driver: fileStore.driver, root: fileStore.root },
    };
  });
}
