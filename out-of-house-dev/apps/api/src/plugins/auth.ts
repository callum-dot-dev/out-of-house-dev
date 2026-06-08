// Viewer resolution + route guards. requireAuth/requireRole are used as route
// preHandlers; attachViewer is a global hook that sets request.viewer when a
// valid access cookie is present (so optional-auth routes can branch).
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { AT_COOKIE } from '../lib/cookies';
import { verifyAccess } from '../lib/jwt';
import { forbidden, unauthorized } from '../lib/errors';
import type { Role, Viewer } from '../types';

async function loadViewer(req: FastifyRequest): Promise<Viewer | null> {
  const token = req.cookies?.[AT_COOKIE];
  if (!token) return null;
  const claims = await verifyAccess(token);
  if (!claims) return null;
  return { id: claims.sub, role: claims.role as Role, email: claims.email };
}

export async function attachViewer(req: FastifyRequest): Promise<void> {
  req.viewer = (await loadViewer(req)) ?? undefined;
}

export async function requireAuth(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const viewer = await loadViewer(req);
  if (!viewer) throw unauthorized();
  req.viewer = viewer;
}

export function requireRole(...roles: Role[]): preHandlerHookHandler {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(req, reply);
    if (!req.viewer || !roles.includes(req.viewer.role)) throw forbidden();
  };
}

/** Convenience: assert and return the viewer inside a handler. */
export function viewerOf(req: FastifyRequest): Viewer {
  if (!req.viewer) throw unauthorized();
  return req.viewer;
}
