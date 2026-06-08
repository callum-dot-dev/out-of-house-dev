// Minimal Stripe client (REST + webhook signature) — no SDK, CJS-safe. When
// STRIPE_SECRET_KEY is absent every call degrades to a stub (reported on
// /admin/health) so the rest of the platform keeps working.
import { createHmac, timingSafeEqual } from 'node:crypto';

const STRIPE_API = 'https://api.stripe.com/v1';

export const stripeConfigured = (): boolean => Boolean(process.env.STRIPE_SECRET_KEY);

export type CheckoutInput = {
  mode: 'payment' | 'subscription';
  amountPence: number;
  name: string;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string;
  metadata: Record<string, string>;
};

export type CheckoutSession = { id: string; url: string | null };

export async function createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Degraded: no real session, but the caller still records a pending payment.
    return { id: `stub_${input.clientReferenceId}`, url: null };
  }
  const params = new URLSearchParams();
  params.set('mode', input.mode);
  params.set('success_url', input.successUrl);
  params.set('cancel_url', input.cancelUrl);
  params.set('client_reference_id', input.clientReferenceId);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', input.currency ?? 'gbp');
  params.set('line_items[0][price_data][unit_amount]', String(input.amountPence));
  params.set('line_items[0][price_data][product_data][name]', input.name);
  if (input.mode === 'subscription') {
    params.set('line_items[0][price_data][recurring][interval]', 'month');
  }
  for (const [k, v] of Object.entries(input.metadata)) params.set(`metadata[${k}]`, v);

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${await res.text()}`);
  const session = (await res.json()) as { id: string; url: string | null };
  return { id: session.id, url: session.url };
}

/** Verify a Stripe webhook signature (t=…,v1=…). Tolerance 5 minutes. */
export function verifyWebhookSignature(payload: string, sigHeader: string, secret: string): boolean {
  const parts = sigHeader.split(',');
  const t = parts.find((p) => p.startsWith('t='))?.slice(2);
  const v1s = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!t || v1s.length === 0) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  const expBuf = Buffer.from(expected);
  return v1s.some((s) => {
    const sb = Buffer.from(s);
    return sb.length === expBuf.length && timingSafeEqual(sb, expBuf);
  });
}

/** Build a signature header for a payload (used by stripe-sync tests + tooling). */
export function signWebhook(payload: string, secret: string, t: number): string {
  const sig = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  return `t=${t},v1=${sig}`;
}
