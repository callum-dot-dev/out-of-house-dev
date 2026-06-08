// The remaining platform read/write endpoints the frontend pages need (so the
// supabase→api port has a route for every call). All viewer-scoped (A2).
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireRole, viewerOf } from '../plugins/auth';
import { uuidParam } from '../lib/http';
import { one, query } from '../lib/db';
import { canAccessProject } from '../repos/projects';
import { isStaff } from '../types';
import { audit } from '../services/audit';
import { notFound } from '../lib/errors';

export default async function platformRoutes(app: FastifyInstance): Promise<void> {
  // --- dashboards (role-aware aggregate) ---
  app.get('/dashboard', { preHandler: requireAuth }, async (req) => {
    const v = viewerOf(req);
    if (isStaff(v)) {
      const counts = await one(`select
        (select count(*)::int from applications where status='pending') as pending_applications,
        (select count(*)::int from projects) as projects,
        (select count(*)::int from feature_requests where status not in ('shipped','rejected')) as open_requests,
        (select count(*)::int from feature_requests where status='review') as in_review,
        (select count(*)::int from users) as users,
        (select count(*)::int from claude_runs where status='awaiting_review') as awaiting_review`);
      return { role: v.role, ...counts };
    }
    const counts = await one(
      `select
        (select count(*)::int from projects where client_id=$1) as projects,
        (select count(*)::int from feature_requests fr join projects p on p.id=fr.project_id where p.client_id=$1 and fr.status not in ('shipped','rejected')) as open_requests,
        (select count(*)::int from feature_requests fr join projects p on p.id=fr.project_id where p.client_id=$1 and fr.status='shipped') as shipped`,
      [v.id],
    );
    return { role: v.role, ...counts };
  });

  // --- project sub-resources (membership-scoped) ---
  const guardProject = async (req: Parameters<typeof viewerOf>[0]) => {
    const v = viewerOf(req);
    const id = uuidParam(req);
    if (!(await canAccessProject(v, id))) throw notFound();
    return id;
  };

  app.get('/projects/:id/activity', { preHandler: requireAuth }, async (req) => {
    const id = await guardProject(req);
    return { activity: (await query('select * from activity_events where project_id=$1 order by created_at desc limit 100', [id])).rows };
  });

  app.get('/projects/:id/decisions', { preHandler: requireAuth }, async (req) => {
    const id = await guardProject(req);
    return { decisions: (await query('select * from decisions where project_id=$1 order by created_at desc', [id])).rows };
  });

  app.get('/projects/:id/plans', { preHandler: requireAuth }, async (req) => {
    const id = await guardProject(req);
    return { plans: (await query('select * from project_plans where project_id=$1 order by created_at desc', [id])).rows };
  });

  app.post('/projects/:id/plans', { preHandler: requireRole('admin', 'developer') }, async (req) => {
    const v = viewerOf(req);
    const id = uuidParam(req);
    const b = z.object({ template_id: z.string().uuid(), style: z.string().optional() }).parse(req.body);
    const tpl = await one<{ phases: unknown }>('select phases from plan_templates where id=$1', [b.template_id]);
    if (!tpl) throw notFound();
    const plan = await one('insert into project_plans(project_id, template_id, phases) values ($1,$2,$3) returning *', [id, b.template_id, JSON.stringify(tpl.phases)]);
    if (b.style) await one('update projects set metadata = metadata || jsonb_build_object(\'style\', $2::text) where id=$1 returning id', [id, b.style]);
    await audit(v, 'plan.spawned', { table: 'project_plans', id }, { template_id: b.template_id });
    return { plan };
  });

  app.get('/projects/:id/documents', { preHandler: requireAuth }, async (req) => {
    const v = viewerOf(req);
    const id = await guardProject(req);
    const rows = isStaff(v)
      ? (await query('select * from project_documents where project_id=$1 order by created_at desc', [id])).rows
      : (await query('select * from project_documents where project_id=$1 and visible_to_client=true order by created_at desc', [id])).rows;
    return { documents: rows };
  });

  app.get('/projects/:id/changelog', { preHandler: requireAuth }, async (req) => {
    const id = await guardProject(req);
    return { entries: (await query('select * from changelog_entries where project_id=$1 order by created_at desc', [id])).rows };
  });

  app.get('/requests/:id/attachments', { preHandler: requireAuth }, async (req) => {
    const v = viewerOf(req);
    const id = uuidParam(req);
    const fr = await one<{ project_id: string }>('select project_id from feature_requests where id=$1', [id]);
    if (!fr || !(await canAccessProject(v, fr.project_id))) throw notFound();
    return { attachments: (await query('select * from attachments where request_id=$1 order by created_at desc', [id])).rows };
  });

  // --- billing (own subscriptions + payments) ---
  app.get('/billing', { preHandler: requireAuth }, async (req) => {
    const v = viewerOf(req);
    const subs = (await query('select * from subscriptions where client_id=$1 order by created_at desc', [v.id])).rows;
    const payments = (await query('select * from payments where user_id=$1 order by created_at desc limit 50', [v.id])).rows;
    return { subscriptions: subs, payments, portal_url: process.env.STRIPE_PORTAL_RETURN_URL ?? null };
  });

  // --- board (staff: requests across projects) ---
  app.get('/board', { preHandler: requireRole('admin', 'developer') }, async () => {
    const requests = (await query('select fr.*, p.name as project_name from feature_requests fr join projects p on p.id=fr.project_id order by fr.created_at desc limit 500')).rows;
    return { requests };
  });

  // --- admin: users + audit ---
  app.get('/admin/users', { preHandler: requireRole('admin') }, async () => {
    return { users: (await query('select id, email, full_name, company, role, created_at, last_login_at from users order by created_at desc')).rows };
  });

  app.patch('/admin/users/:id', { preHandler: requireRole('admin') }, async (req) => {
    const v = viewerOf(req);
    const id = uuidParam(req);
    const b = z.object({ role: z.enum(['client', 'developer', 'admin']) }).parse(req.body);
    const row = await one('update users set role=$2 where id=$1 returning id, email, role', [id, b.role]);
    if (!row) throw notFound();
    await audit(v, 'user.role_changed', { table: 'users', id }, { role: b.role });
    return { user: row };
  });

  app.get('/admin/audit', { preHandler: requireRole('admin') }, async (req) => {
    const limit = Math.min(500, Number((req.query as { limit?: string } | undefined)?.limit) || 100);
    return { events: (await query('select * from audit_events order by created_at desc limit $1', [limit])).rows };
  });

  // --- public showcase ---
  app.get('/showcase', async () => {
    return { projects: (await query("select id, name, project_type, description, preview_url from projects where showcase_opt_in=true and status in ('live','completed') order by created_at desc limit 24")).rows };
  });

  // --- GDPR export (own data) ---
  app.get('/me/export', { preHandler: requireAuth }, async (req) => {
    const v = viewerOf(req);
    const [user, projects, requests, notifications, payments] = await Promise.all([
      one('select id, email, full_name, company, role, created_at from users where id=$1', [v.id]),
      query('select * from projects where client_id=$1', [v.id]),
      query('select fr.* from feature_requests fr join projects p on p.id=fr.project_id where p.client_id=$1', [v.id]),
      query('select * from notifications where user_id=$1', [v.id]),
      query('select * from payments where user_id=$1', [v.id]),
    ]);
    return { user, projects: projects.rows, requests: requests.rows, notifications: notifications.rows, payments: payments.rows };
  });
}
