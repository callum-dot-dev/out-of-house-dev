// Idempotently create/update Stripe products + prices from the Appendix A price
// book (apps/api/src/lib/pricing.ts). lookup_key = SKU. Dry-run (no key) just
// lists the catalogue. Run: npm run stripe:sync
import { Client } from 'pg';
import { CATALOGUE } from '../apps/api/src/lib/pricing';

const STRIPE = 'https://api.stripe.com/v1';

async function stripe<T>(method: string, path: string, form?: Record<string, string>): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY as string;
  const res = await fetch(`${STRIPE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  if (!res.ok) throw new Error(`Stripe ${method} ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

async function main(): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY;
  const skus = Object.values(CATALOGUE);

  if (!key) {
    console.log('STRIPE_SECRET_KEY not set — dry run. Catalogue:');
    for (const s of skus) console.log(`  ${s.sku.padEnd(34)} £${(s.pence / 100).toFixed(2).padStart(9)}  ${s.mode}  (${s.product_type})`);
    console.log(`\n${skus.length} SKUs.`);
    return;
  }

  const db = process.env.DATABASE_URL ? new Client({ connectionString: process.env.DATABASE_URL }) : null;
  if (db) await db.connect();

  for (const s of skus) {
    // idempotent on lookup_key
    const existing = await stripe<{ data: Array<{ id: string; product: string }> }>('GET', `/prices?lookup_keys[]=${encodeURIComponent(s.sku)}&limit=1`);
    let priceId: string;
    let productId: string;
    if (existing.data.length) {
      priceId = existing.data[0].id;
      productId = existing.data[0].product;
    } else {
      const product = await stripe<{ id: string }>('POST', '/products', { name: s.name, 'metadata[sku]': s.sku });
      productId = product.id;
      const priceForm: Record<string, string> = {
        product: productId,
        currency: 'gbp',
        unit_amount: String(s.pence),
        lookup_key: s.sku,
        transfer_lookup_key: 'true',
      };
      if (s.mode === 'monthly') priceForm['recurring[interval]'] = 'month';
      const price = await stripe<{ id: string }>('POST', '/prices', priceForm);
      priceId = price.id;
    }
    if (db) {
      await db.query(
        `insert into stripe_price_map(sku, product_id, price_id, pence, mode, updated_at)
           values ($1,$2,$3,$4,$5, now())
         on conflict (sku) do update set product_id=excluded.product_id, price_id=excluded.price_id, pence=excluded.pence, mode=excluded.mode, updated_at=now()`,
        [s.sku, productId, priceId, s.pence, s.mode],
      );
    }
    console.log(`  ✓ ${s.sku} -> ${priceId}`);
  }

  if (db) await db.end();
  console.log(`Synced ${skus.length} SKUs.`);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
