import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { one } from '../lib/db';
import { getUserById, publicUser, setPassword } from '../repos/users';
import { requireAuth, viewerOf } from '../plugins/auth';
import { hashPassword, verifyPassword } from '../lib/crypto';
import { badRequest, unauthorized } from '../lib/errors';

export default async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', { preHandler: requireAuth }, async (req) => {
    const user = await getUserById(viewerOf(req).id);
    if (!user) throw unauthorized();
    return { user: publicUser(user) };
  });

  app.patch('/me', { preHandler: requireAuth }, async (req) => {
    const v = viewerOf(req);
    const b = z
      .object({
        full_name: z.string().max(200).optional(),
        company: z.string().max(200).optional(),
        timezone: z.string().max(64).optional(),
        notify_email: z.boolean().optional(),
        notify_in_app: z.boolean().optional(),
      })
      .parse(req.body);

    const fields = ['full_name', 'company', 'timezone', 'notify_email', 'notify_in_app'] as const;
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    for (const k of fields) {
      if (b[k] !== undefined) {
        sets.push(`${k}=$${i++}`);
        vals.push(b[k]);
      }
    }
    if (sets.length) {
      vals.push(v.id);
      await one(`update users set ${sets.join(', ')} where id=$${i} returning id`, vals);
    }
    const user = await getUserById(v.id);
    return { user: publicUser(user!) };
  });

  app.post('/me/password', { preHandler: requireAuth }, async (req) => {
    const v = viewerOf(req);
    const b = z.object({ current: z.string(), next: z.string().min(8) }).parse(req.body);
    const user = await getUserById(v.id);
    const ok = user?.password_hash ? await verifyPassword(user.password_hash, b.current) : false;
    if (!user || !ok) throw badRequest('Current password incorrect', 'wrong_password');
    await setPassword(user.id, await hashPassword(b.next));
    return { ok: true };
  });
}
