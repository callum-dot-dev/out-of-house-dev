import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../plugins/auth';
import { issueCertificate } from '../services/certificates';
import { badRequest } from '../lib/errors';

export default async function certificateRoutes(app: FastifyInstance): Promise<void> {
  app.post('/admin/certificates', { preHandler: requireRole('admin', 'developer') }, async (req) => {
    const b = z.object({ enrollment_id: z.string().uuid(), grade: z.string().max(40).optional() }).parse(req.body);
    const result = await issueCertificate(b.enrollment_id, b.grade);
    if ('error' in result) throw badRequest(result.error, 'cert_error');
    return result;
  });
}
