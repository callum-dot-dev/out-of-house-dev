import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole, viewerOf } from '../plugins/auth';
import { uuidParam } from '../lib/http';
import { one } from '../lib/db';
import { audit } from '../services/audit';
import { notFound } from '../lib/errors';

const PROJECT_TYPES = ['website', 'automation', 'web_app', 'custom_software', 'platform', 'maintenance', 'aiseo', 'lead_engine', 'other'] as const;

export default async function projectAdminRoutes(app: FastifyInstance): Promise<void> {
  app.post('/projects', { preHandler: requireRole('admin') }, async (req) => {
    const v = viewerOf(req);
    const b = z
      .object({
        client_id: z.string().uuid(),
        name: z.string().min(1).max(200),
        project_type: z.enum(PROJECT_TYPES),
        description: z.string().max(5000).optional(),
        metadata: z.record(z.unknown()).optional(),
      })
      .parse(req.body);
    const row = await one(
      'insert into projects(client_id, name, project_type, description, metadata) values ($1,$2,$3,$4,$5) returning *',
      [b.client_id, b.name, b.project_type, b.description ?? null, JSON.stringify(b.metadata ?? {})],
    );
    await audit(v, 'project.created', { table: 'projects', id: (row as { id: string }).id });
    return { project: row };
  });

  app.patch('/projects/:id', { preHandler: requireRole('admin', 'developer') }, async (req) => {
    const v = viewerOf(req);
    const id = uuidParam(req);
    const b = z
      .object({
        status: z.enum(['discovery', 'building', 'live', 'paused', 'completed']).optional(),
        name: z.string().max(200).optional(),
        description: z.string().max(5000).optional(),
        repo_url: z.string().max(400).optional(),
        preview_url: z.string().max(400).optional(),
        retainer_tier: z.enum(['lightweight', 'standard', 'heavy']).nullable().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
      .parse(req.body);
    const fields = ['status', 'name', 'description', 'repo_url', 'preview_url', 'retainer_tier'] as const;
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    for (const k of fields) {
      if (b[k] !== undefined) {
        sets.push(`${k}=$${i++}`);
        vals.push(b[k]);
      }
    }
    if (b.metadata !== undefined) {
      sets.push(`metadata = metadata || $${i++}::jsonb`);
      vals.push(JSON.stringify(b.metadata));
    }
    if (!sets.length) {
      const cur = await one('select * from projects where id=$1', [id]);
      if (!cur) throw notFound();
      return { project: cur };
    }
    vals.push(id);
    const row = await one(`update projects set ${sets.join(', ')} where id=$${i} returning *`, vals);
    if (!row) throw notFound();
    await audit(v, 'project.updated', { table: 'projects', id }, b);
    return { project: row };
  });
}
