// Public endpoints: certificate verify, status, live stats, waitlist, contact.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { one, query } from '../lib/db';
import { notFound } from '../lib/errors';

export default async function publicRoutes(app: FastifyInstance): Promise<void> {
  app.get('/verify/:code', async (req) => {
    const code = (req.params as { code: string }).code;
    const row = await one<{ revoked_at: string | null }>('select * from certificate_verifications where certificate_code=$1', [code]);
    if (!row) throw notFound();
    return { certificate: row, valid: !row.revoked_at };
  });

  app.get('/status', async () => {
    const incidents = (
      await query('select title, severity, started_at from status_incidents where resolved_at is null order by started_at desc')
    ).rows;
    const monitors = (await query('select count(*)::int as n from uptime_checks where enabled = true')).rows[0] as { n: number };
    return { status: incidents.length ? 'incident' : 'operational', open_incidents: incidents, monitors: monitors.n };
  });

  app.get('/live', async () => {
    const shipped = (await query("select count(*)::int as n from feature_requests where status='shipped'")).rows[0] as { n: number };
    const automations = (await query("select count(*)::int as n from projects where project_type='automation'")).rows[0] as { n: number };
    const certs = (await query('select count(*)::int as n from certificates where revoked_at is null')).rows[0] as { n: number };
    return { builds_shipped: shipped.n, automations_live: automations.n, certificates_issued: certs.n };
  });

  app.post('/waitlist', async (req) => {
    const b = z.object({ email: z.string().email(), product: z.string().min(1).max(120), source: z.string().max(120).optional() }).parse(req.body);
    await query('insert into waitlist(email, product, source) values ($1,$2,$3) on conflict (email, product) do nothing', [b.email, b.product, b.source ?? null]);
    return { ok: true };
  });

  app.post('/forms/contact', async (req) => {
    const b = z
      .object({
        name: z.string().max(200).optional(),
        email: z.string().email(),
        message: z.string().min(1).max(5000),
        project_id: z.string().uuid().optional(),
        website: z.string().optional(), // honeypot
      })
      .parse(req.body);
    if (b.website) return { ok: true };
    await one("insert into admin_alerts(severity, kind, title, body) values ('info','contact_form',$1,$2) returning id", [
      `Contact from ${b.email}`,
      b.message.slice(0, 1000),
    ]);
    return { ok: true };
  });
}
