import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireAuth, attachViewer, viewerOf } from '../plugins/auth';
import { fileStore } from '../lib/filestore';
import { one, query } from '../lib/db';
import { badRequest, forbidden, notFound, unauthorized } from '../lib/errors';
import { isStaff } from '../types';

const SCOPES = ['attachments', 'documents', 'voice', 'avatars', 'reports', 'logovault'] as const;
const MAX_BYTES: Record<string, number> = { avatars: 2 * 1024 * 1024 };
const DEFAULT_MAX = 25 * 1024 * 1024;

export default async function fileRoutes(app: FastifyInstance): Promise<void> {
  app.post('/files', { preHandler: requireAuth }, async (req, reply) => {
    const v = viewerOf(req);
    const scope = z
      .enum(SCOPES)
      .catch('attachments')
      .parse((req.query as { scope?: string } | undefined)?.scope ?? 'attachments');

    const data = await req.file();
    if (!data) throw badRequest('No file uploaded', 'no_file');

    const id = randomUUID();
    const safeName = String(data.filename ?? 'file')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 120);
    const key = `${scope}/${v.id}/${id}-${safeName}`;

    await fileStore.put(key, data.file);
    const size = fileStore.size(key);
    const limit = MAX_BYTES[scope] ?? DEFAULT_MAX;
    if (size > limit) {
      await fileStore.remove(key);
      throw badRequest('File too large', 'too_large');
    }
    await query(
      'insert into files(path, store, size, mime, owner_id, scope) values ($1,$2,$3,$4,$5,$6)',
      [key, 'disk', size, data.mimetype ?? null, v.id, scope],
    );
    return reply.code(201).send({ file: { path: key, size, mime: data.mimetype, scope } });
  });

  app.get('/files/*', { preHandler: attachViewer }, async (req, reply) => {
    const key = (req.params as Record<string, string>)['*'];
    const f = await one<{ scope: string; owner_id: string | null; mime: string | null }>(
      'select scope, owner_id, mime from files where path=$1',
      [key],
    );
    if (!f) throw notFound();

    if (f.scope !== 'avatars') {
      if (!req.viewer) throw unauthorized();
      if (f.owner_id !== req.viewer.id && !isStaff(req.viewer)) throw forbidden();
    }
    if (!fileStore.exists(key)) throw notFound();

    reply.header('content-type', f.mime ?? 'application/octet-stream');
    if (f.scope === 'avatars') reply.header('cache-control', 'public, max-age=86400');
    return reply.send(fileStore.read(key));
  });
}
