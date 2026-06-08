import type { FastifyInstance } from 'fastify';
import { one } from '../lib/db';
import { verifyWebhookSignature } from '../lib/stripe';
import { handleStripeEvent } from '../services/stripeWebhook';

export default async function stripeWebhookRoutes(app: FastifyInstance): Promise<void> {
  // Capture the raw body (needed for signature verification) within this
  // encapsulated plugin only, so global JSON parsing is unaffected.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    (_req as unknown as { rawBody: string }).rawBody = body as string;
    try {
      done(null, JSON.parse(body as string));
    } catch {
      done(null, {});
    }
  });

  app.post('/webhooks/stripe', async (req, reply) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return reply.code(503).send({ error: { code: 'not_configured', message: 'stripe webhook not configured' } });
    const sig = req.headers['stripe-signature'];
    const payload = (req as unknown as { rawBody?: string }).rawBody ?? '';
    if (typeof sig !== 'string' || !verifyWebhookSignature(payload, sig, secret)) {
      return reply.code(400).send({ error: { code: 'bad_signature', message: 'invalid signature' } });
    }
    const event = JSON.parse(payload) as { id: string; type: string; data: { object: Record<string, unknown> } };

    // idempotency: first writer wins
    const inserted = await one('insert into stripe_events(id, type) values ($1,$2) on conflict (id) do nothing returning id', [
      event.id,
      event.type,
    ]);
    if (!inserted) return { received: true, duplicate: true };

    await handleStripeEvent(event);
    return { received: true };
  });
}
