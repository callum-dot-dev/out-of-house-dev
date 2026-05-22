// stripe-webhook
//
// Receives Stripe events. We only act on `checkout.session.completed` and
// `invoice.payment_failed` for v1. On completion we:
//   - flip the corresponding `payments` row to succeeded
//   - upsert the downstream record (enrollment / coaching_booking / subscription)
//
// Verifies the signature using STRIPE_WEBHOOK_SECRET.

import { admin } from '../_shared/supabase-admin.ts';

const enc = new TextEncoder();

const verifyStripeSignature = async (payload: string, sigHeader: string, secret: string) => {
  // signature header format: t=...,v1=...,v1=...
  const parts = Object.fromEntries(sigHeader.split(',').map((kv) => kv.split('=')) as [string, string][]);
  const timestamp = parts['t'];
  const v1Sigs = sigHeader.split(',').filter((s) => s.startsWith('v1=')).map((s) => s.slice(3));
  if (!timestamp || v1Sigs.length === 0) return false;
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(signedPayload));
  const hex = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return v1Sigs.some((s) => s === hex);
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) return new Response('webhook secret not set', { status: 500 });

  const sig = req.headers.get('stripe-signature');
  const payload = await req.text();
  if (!sig || !(await verifyStripeSignature(payload, sig, secret))) {
    return new Response('bad signature', { status: 400 });
  }

  const event = JSON.parse(payload);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const payment_id = session.metadata?.payment_id || session.client_reference_id;
    if (!payment_id) return new Response('missing payment_id', { status: 200 });

    const { data: pay } = await admin
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (!pay) return new Response('payment not found', { status: 200 });

    await admin.from('payments').update({
      status: 'succeeded',
      stripe_payment_intent_id: session.payment_intent || pay.stripe_payment_intent_id,
    }).eq('id', payment_id);

    // Downstream actions
    if (pay.product_type === 'course' || pay.product_type === 'programme') {
      // product_ref like 'course:ai-builder-6w'
      const slug = (pay.product_ref || '').replace(/^course:/, '');
      const { data: prog } = await admin
        .from('programmes')
        .select('id, audience, duration_weeks')
        .eq('slug', slug)
        .maybeSingle();
      if (prog) {
        // pick next open cohort
        const { data: cohort } = await admin
          .from('cohorts')
          .select('id, capacity, enrolled_count')
          .eq('programme_id', prog.id)
          .in('status', ['open', 'filling'])
          .order('start_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        await admin.from('enrollments').upsert({
          user_id: pay.user_id,
          programme_id: prog.id,
          cohort_id: cohort?.id || null,
          status: 'paid',
          payment_id: pay.id,
          amount_paid_gbp: pay.amount_gbp,
        }, { onConflict: 'user_id,programme_id,cohort_id' });
      }
    }

    if (pay.product_type === 'coaching_hour') {
      const [, track, , scheduledIso] = (pay.product_ref || '').split(':'); // 'coaching:dev:at:2026-06-01T10:00:00Z'
      await admin.from('coaching_bookings').insert({
        user_id: pay.user_id,
        track: track === 'business' ? 'business' : 'developer',
        scheduled_at: scheduledIso || new Date().toISOString(),
        duration_min: 60,
        hourly_rate_gbp: 100,
        total_gbp: pay.amount_gbp,
        status: 'paid',
        payment_id: pay.id,
      });
    }

    if (pay.product_type === 'saas_subscription') {
      // product_ref like 'subscription:logovault:studio'
      const parts = (pay.product_ref || '').split(':');
      const plan = parts[2] || 'indie';
      await admin.from('subscriptions').upsert({
        client_id: pay.user_id,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        plan,
        status: 'active',
      });
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const inv = event.data.object;
    if (inv.subscription) {
      await admin.from('subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_subscription_id', inv.subscription);
    }
  }

  return new Response('ok', { status: 200 });
});
