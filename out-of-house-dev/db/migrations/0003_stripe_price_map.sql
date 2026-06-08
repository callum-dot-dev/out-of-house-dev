-- 0003 — stripe price map (written by scripts/stripe-sync.ts; read by checkout).
create table stripe_price_map (
  sku        text primary key,
  product_id text,
  price_id   text,
  pence      int not null,
  mode       text not null,
  updated_at timestamptz not null default now()
);
