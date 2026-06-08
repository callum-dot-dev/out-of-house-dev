import type { FastifyInstance } from 'fastify';
import { requireRole, viewerOf } from '../plugins/auth';
import { query } from '../lib/db';
import { EMAIL_DRY_RUN, integrationStatus } from '../lib/env';
import { fileStore } from '../lib/filestore';
import { triggerJob } from '../lib/jobsClient';
import { audit } from '../services/audit';

export default async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.get('/admin/health', { preHandler: requireRole('admin') }, async () => {
    let db: 'ok' | 'error' = 'ok';
    try {
      await query('select 1');
    } catch {
      db = 'error';
    }
    let queueDepth = 0;
    try {
      queueDepth = Number((await query<{ n: number }>("select count(*)::int as n from pgboss.job where state in ('created','active','retry')")).rows[0]?.n ?? 0);
    } catch {
      /* pgboss not initialised yet */
    }
    return {
      ok: db === 'ok',
      db,
      email_dry_run: EMAIL_DRY_RUN(),
      integrations: integrationStatus(),
      queues: { pending: queueDepth },
      storage: { driver: fileStore.driver, root: fileStore.root },
    };
  });

  app.get('/admin/jobs', { preHandler: requireRole('admin') }, async () => {
    let queues: unknown[] = [];
    let schedules: unknown[] = [];
    try {
      queues = (await query('select name, state, count(*)::int as n from pgboss.job group by name, state order by name')).rows;
    } catch {
      /* pgboss schema absent until the worker has started */
    }
    try {
      schedules = (await query('select name, cron from pgboss.schedule order by name')).rows;
    } catch {
      /* ignore */
    }
    const recentFailures = (await query("select title, body, created_at from admin_alerts where kind='job_failed' order by created_at desc limit 20")).rows;
    return { queues, schedules, recent_failures: recentFailures };
  });

  app.post('/admin/jobs/:name/run', { preHandler: requireRole('admin') }, async (req) => {
    const name = (req.params as { name: string }).name;
    const id = await triggerJob(name, (req.body as Record<string, unknown>) ?? {});
    await audit(viewerOf(req), 'jobs.manual_trigger', { table: 'pgboss' }, { name });
    return { enqueued: true, job_id: id };
  });
}
