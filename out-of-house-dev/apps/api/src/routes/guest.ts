import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { consumeGuestToken } from '../repos/tokens';
import { badRequest } from '../lib/errors';

export default async function guestRoutes(app: FastifyInstance): Promise<void> {
  app.post('/guest/consume', async (req) => {
    const { token } = z.object({ token: z.string() }).parse(req.body);
    const row = await consumeGuestToken(token);
    if (!row) throw badRequest('Invalid or expired token', 'invalid_guest');
    return { scope: { kind: row.scope_kind, project_id: row.project_id, request_id: row.request_id } };
  });
}
