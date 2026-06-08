import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, viewerOf } from '../plugins/auth';
import { one } from '../lib/db';
import { resolveSku } from '../lib/pricing';
import { createCheckoutSession, stripeConfigured } from '../lib/stripe';
import { siteUrl } from '../lib/http';
import { badRequest } from '../lib/errors';

export default async function checkoutRoutes(app: FastifyInstance): Promise<void> {
  app.post('/checkout', { preHandler: requireAuth }, async (req) => {
    const v = viewerOf(req);
    const b = z
      .object({
        product_ref: z.string().min(1).max(120),
        success_url: z.string().url().optional(),
        cancel_url: z.string().url().optional(),
        metadata: z.record(z.string()).optional(),
      })
      .parse(req.body);

    const sku = resolveSku(b.product_ref);
    if (!sku) throw badRequest('Unknown product', 'unknown_product');

    const pay = await one<{ id: string }>(
      'insert into payments(user_id, amount_gbp, product_type, product_ref, status, metadata) values ($1,$2,$3,$4,$5,$6) returning id',
      [v.id, (sku.pence / 100).toFixed(2), sku.product_type, b.product_ref, 'pending', JSON.stringify(b.metadata ?? {})],
    );
    const paymentId = pay!.id;

    const session = await createCheckoutSession({
      mode: sku.mode === 'monthly' ? 'subscription' : 'payment',
      amountPence: sku.pence,
      name: sku.name,
      successUrl: b.success_url ?? `${siteUrl()}/app/billing?success=1`,
      cancelUrl: b.cancel_url ?? `${siteUrl()}/app/billing`,
      clientReferenceId: paymentId,
      metadata: { payment_id: paymentId, product_ref: b.product_ref, user_id: v.id },
    });
    await one('update payments set stripe_session_id=$2 where id=$1 returning id', [paymentId, session.id]);

    return { url: session.url, session_id: session.id, payment_id: paymentId, configured: stripeConfigured() };
  });
}
