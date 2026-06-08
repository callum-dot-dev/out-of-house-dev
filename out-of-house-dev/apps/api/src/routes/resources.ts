// Viewer-scoped read routes (the surface the isolation suite exercises). Full
// CRUD for these resources is added in Phase 3; the scoping primitives live in
// the repos.
import type { FastifyInstance } from 'fastify';
import { requireAuth, viewerOf } from '../plugins/auth';
import { uuidParam } from '../lib/http';
import { getProjectScoped, listProjectsScoped } from '../repos/projects';
import { getRequestScoped, listRequestsForProject } from '../repos/featureRequests';
import { getDocumentScoped } from '../repos/documents';
import { getNotificationScoped, listNotifications, markRead } from '../repos/notifications';
import { notFound } from '../lib/errors';

export default async function resourceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/projects', { preHandler: requireAuth }, async (req) => ({
    projects: await listProjectsScoped(viewerOf(req)),
  }));

  app.get('/projects/:id', { preHandler: requireAuth }, async (req) => {
    const row = await getProjectScoped(viewerOf(req), uuidParam(req));
    if (!row) throw notFound();
    return { project: row };
  });

  app.get('/projects/:id/requests', { preHandler: requireAuth }, async (req) => {
    const list = await listRequestsForProject(viewerOf(req), uuidParam(req));
    if (list === null) throw notFound();
    return { requests: list };
  });

  app.get('/requests/:id', { preHandler: requireAuth }, async (req) => {
    const row = await getRequestScoped(viewerOf(req), uuidParam(req));
    if (!row) throw notFound();
    return { request: row };
  });

  app.get('/documents/:id', { preHandler: requireAuth }, async (req) => {
    const row = await getDocumentScoped(viewerOf(req), uuidParam(req));
    if (!row) throw notFound();
    return { document: row };
  });

  app.get('/notifications', { preHandler: requireAuth }, async (req) => ({
    notifications: await listNotifications(viewerOf(req)),
  }));

  app.get('/notifications/:id', { preHandler: requireAuth }, async (req) => {
    const row = await getNotificationScoped(viewerOf(req), uuidParam(req));
    if (!row) throw notFound();
    return { notification: row };
  });

  app.post('/notifications/:id/read', { preHandler: requireAuth }, async (req) => {
    const row = await markRead(viewerOf(req), uuidParam(req));
    if (!row) throw notFound();
    return { notification: row };
  });
}
