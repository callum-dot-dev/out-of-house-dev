// Stripe event fan-out (ported from supabase/functions/stripe-webhook). Called
// only after signature verification + idempotency insert in the route.
import { one } from '../lib/db';
import { notify } from './notifications';

type StripeEvent = { id: string; type: string; data: { object: Record<string, unknown> } };

export async function handleStripeEvent(event: StripeEvent): Promise<void> {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Record<string, unknown>;
    const meta = (session.metadata as Record<string, string>) ?? {};
    const paymentId = meta.payment_id ?? (session.client_reference_id as string | undefined);
    if (!paymentId) return;

    const pay = await one<{
      id: string;
      user_id: string | null;
      product_type: string;
      product_ref: string | null;
      amount_gbp: string;
    }>('select id, user_id, product_type, product_ref, amount_gbp from payments where id=$1', [paymentId]);
    if (!pay) return;

    await one("update payments set status='succeeded', stripe_payment_intent_id=$2 where id=$1 returning id", [
      paymentId,
      (session.payment_intent as string | undefined) ?? null,
    ]);

    if (pay.product_type === 'course' && pay.user_id) {
      const slug = String(pay.product_ref ?? '').replace(/^course:/, '');
      const prog = await one<{ id: string }>('select id from programmes where slug=$1', [slug]);
      if (prog) {
        const cohort = await one<{ id: string }>(
          "select id from cohorts where programme_id=$1 and status in ('open','filling') order by start_date asc limit 1",
          [prog.id],
        );
        await one(
          `insert into enrollments(user_id, programme_id, cohort_id, status, payment_id, amount_paid_gbp)
             values ($1,$2,$3,'paid',$4,$5)
           on conflict (user_id, programme_id, cohort_id) do update set status='paid', payment_id=excluded.payment_id returning id`,
          [pay.user_id, prog.id, cohort?.id ?? null, paymentId, pay.amount_gbp],
        );
      }
    }

    if (pay.product_type === 'coaching_hour' && pay.user_id) {
      await one(
        "insert into coaching_bookings(user_id, track, scheduled_at, total_gbp, status, payment_id) values ($1,'developer', now(), $2, 'paid', $3) returning id",
        [pay.user_id, pay.amount_gbp, paymentId],
      );
    }

    if ((pay.product_type === 'saas_subscription' || pay.product_type === 'retainer') && pay.user_id) {
      await one(
        "insert into subscriptions(client_id, stripe_customer_id, stripe_subscription_id, plan, status) values ($1,$2,$3,$4,'active') returning id",
        [pay.user_id, (session.customer as string | undefined) ?? null, (session.subscription as string | undefined) ?? null, pay.product_ref ?? null],
      );
    }

    if (pay.user_id) {
      await notify(pay.user_id, {
        kind: 'payment_succeeded',
        title: 'Payment received',
        body: `£${pay.amount_gbp} — ${pay.product_ref ?? pay.product_type}`,
        link: '/app/billing',
      });
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const inv = event.data.object as Record<string, unknown>;
    const sub = inv.subscription as string | undefined;
    if (sub) {
      await one("update subscriptions set status='past_due' where stripe_subscription_id=$1 returning id", [sub]);
      await one("insert into admin_alerts(severity, kind, title, body) values ('warn','dunning','Invoice payment failed', $1) returning id", [
        `subscription ${sub}`,
      ]);
    }
  }
}
