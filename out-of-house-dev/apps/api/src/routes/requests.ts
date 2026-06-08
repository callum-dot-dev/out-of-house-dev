import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireRole, viewerOf } from '../plugins/auth';
import { uuidParam } from '../lib/http';
import { one } from '../lib/db';
import { canAccessProject } from '../repos/projects';
import { getRequestScoped } from '../repos/featureRequests';
import { addComment, listComments } from '../repos/comments';
import { notify } from '../services/notifications';
import { audit } from '../services/audit';
import { notFound } from '../lib/errors';

const STATUS = ['submitted', 'scoped', 'quoted', 'planned', 'building', 'review', 'approved', 'deploying', 'shipped', 'rejected', 'blocked'] as const;

export default async function requestRoutes(app: FastifyInstance): Promise<void> {
  app.post('/projects/:id/requests', { preHandler: requireAuth }, async (req) => {
    const v = viewerOf(req);
    const projectId = uuidParam(req);
    if (!(await canAccessProject(v, projectId))) throw notFound();
    const b = z
      .object({
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(5000),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      })
      .parse(req.body);
    const row = await one(
      'insert into feature_requests(project_id, created_by, title, description, priority) values ($1,$2,$3,$4,$5) returning *',
      [projectId, v.id, b.title, b.description, b.priority ?? 'medium'],
    );
    await one(
      "insert into activity_events(project_id, request_id, actor_id, kind, title) values ($1,$2,$3,'request.created',$4) returning id",
      [projectId, (row as { id: string }).id, v.id, `New request: ${b.title}`],
    );
    return { request: row };
  });

  app.patch('/requests/:id', { preHandler: requireRole('admin', 'developer') }, async (req) => {
    const v = viewerOf(req);
    const id = uuidParam(req);
    const existing = await getRequestScoped(v, id);
    if (!existing) throw notFound();
    const b = z
      .object({
        status: z.enum(STATUS).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        claimed_by: z.string().uuid().nullable().optional(),
        risk_class: z.enum(['low', 'standard', 'high']).optional(),
        rejection_reason: z.string().max(2000).optional(),
      })
      .parse(req.body);

    const fields = ['status', 'priority', 'claimed_by', 'risk_class', 'rejection_reason'] as const;
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    for (const k of fields) {
      if (b[k] !== undefined) {
        sets.push(`${k}=$${i++}`);
        vals.push(b[k]);
      }
    }
    if (b.status === 'shipped') sets.push('shipped_at=now()');
    if (!sets.length) return { request: existing };
    vals.push(id);
    const row = await one<{ id: string; title: string }>(`update feature_requests set ${sets.join(', ')} where id=$${i} returning *`, vals);

    const prevStatus = String((existing as Record<string, unknown>).status ?? '');
    if (b.status && b.status !== prevStatus) {
      const projectId = existing.project_id;
      await one(
        "insert into activity_events(project_id, request_id, actor_id, kind, title, payload) values ($1,$2,$3,'request.status_changed',$4,$5) returning id",
        [projectId, id, v.id, `Status: ${prevStatus} -> ${b.status}`, JSON.stringify({ from: prevStatus, to: b.status })],
      );
      const proj = await one<{ client_id: string }>('select client_id from projects where id=$1', [projectId]);
      if (proj) await notify(proj.client_id, { kind: 'request_status', title: `Request moved to ${b.status}`, body: row?.title, link: `/app/requests/${id}` });
    }
    await audit(v, 'request.updated', { table: 'feature_requests', id }, b);
    return { request: row };
  });

  app.get('/requests/:id/comments', { preHandler: requireAuth }, async (req) => {
    const list = await listComments(viewerOf(req), uuidParam(req));
    if (list === null) throw notFound();
    return { comments: list };
  });

  app.post('/requests/:id/comments', { preHandler: requireAuth }, async (req) => {
    const b = z.object({ body: z.string().min(1).max(5000) }).parse(req.body);
    const row = await addComment(viewerOf(req), uuidParam(req), b.body);
    if (!row) throw notFound();
    return { comment: row };
  });
}
