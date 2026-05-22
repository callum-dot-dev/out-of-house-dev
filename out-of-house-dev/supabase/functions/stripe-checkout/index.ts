// stripe-checkout
//
// Creates a Stripe checkout session for one of our product_types:
//   - coaching_hour     (£100/hr)
//   - course            (course slug → price)
//   - programme         (alias of course; left for forward compat)
//   - retainer          (recurring monthly)
//   - one_off_build     (custom amount)
//   - saas_subscription (recurring monthly)
//
// On success Stripe redirects to {success_url}?session_id=… and our
// stripe-webhook function flips the row to `succeeded`, then creates the
// downstream record (enrollment, coaching_booking, subscription, etc).

import { handleOptions, json } from '../_shared/cors.ts';
import { admin } from '../_shared/supabase-admin.ts';

const STRIPE_API = 'https://api.stripe.com/v1';

Deno.serve(async (req) => {
  const opts = handleOptions(req);
  if (opts) return opts;

  try {
    const body = await req.json();
    const {
      product_type,
      product_ref,
      amount_gbp,
      name,
      success_url,
      cancel_url,
      user_id: bodyUserId,
      mode_override,                         // 'subscription' | 'payment' (optional)
      metadata: extraMeta = {},
    } = body;

    if (!product_type || !amount_gbp) return json(req, { error: 'product_type + amount_gbp required' }, { status: 400 });

    // Resolve the authenticated user (RLS-safe — the anon JWT comes through)
    let user_id = bodyUserId || null;
    const authHeader = req.headers.get('Authorization');
    if (!user_id && authHeader) {
      const jwt = authHeader.replace('Bearer ', '');
      const { data: { user } } = await admin.auth.getUser(jwt);
      user_id = user?.id || null;
    }

    const mode = mode_override
      || (product_type === 'retainer' || product_type === 'saas_subscription' ? 'subscription' : 'payment');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return json(req, { error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 });

    // Insert a pending payment row first so we have an id to put in metadata
    const { data: payRow } = await admin.from('payments').insert({
      user_id,
      amount_gbp,
      currency: 'gbp',
      product_type,
      product_ref,
      status: 'pending',
      metadata: extraMeta,
    }).select().single();

    const params = new URLSearchParams();
    params.set('mode', mode);
    params.set('success_url', success_url || 'https://out-of-house.dev/app');
    params.set('cancel_url',  cancel_url  || 'https://out-of-house.dev');
    params.set('line_items[0][quantity]', '1');
    params.set('line_items[0][price_data][currency]', 'gbp');
    params.set('line_items[0][price_data][unit_amount]', String(Math.round(amount_gbp * 100)));
    params.set('line_items[0][price_data][product_data][name]', name || product_ref || product_type);
    if (mode === 'subscription') {
      params.set('line_items[0][price_data][recurring][interval]', 'month');
    }
    params.set('client_reference_id', payRow!.id);
    params.set('metadata[payment_id]', payRow!.id);
    params.set('metadata[product_type]', product_type);
    if (product_ref) params.set('metadata[product_ref]', product_ref);
    if (user_id)     params.set('metadata[user_id]',    user_id);

    const stripeRes = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    if (!stripeRes.ok) {
      const txt = await stripeRes.text();
      await admin.from('payments').update({ status: 'failed', metadata: { ...extraMeta, last_error: txt } }).eq('id', payRow!.id);
      return json(req, { error: 'stripe error', detail: txt }, { status: 502 });
    }
    const session = await stripeRes.json();

    await admin.from('payments').update({
      stripe_session_id: session.id,
      metadata: { ...extraMeta, stripe_session_id: session.id },
    }).eq('id', payRow!.id);

    return json(req, { url: session.url, session_id: session.id, payment_id: payRow!.id });
  } catch (e) {
    console.error('stripe-checkout error', e);
    return json(req, { error: String(e?.message || e) }, { status: 500 });
  }
});
