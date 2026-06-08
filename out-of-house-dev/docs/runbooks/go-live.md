# Go-live runbook (Render)

One push deploys everything via `render.yaml` (at the **git repo root**, one level
above the `out-of-house-dev/` project). Follow in order.

## 1. Accounts + keys (Appendix F)
Create the accounts and generate the keys listed in `docs/HANDOVER.md` /
`.env.example`. You only need Render + Postgres to boot; integrations can be added
later (each shows as `missing` on `/api/v1/admin/health` until its key lands).

## 2. First deploy
1. Render → **New → Blueprint** → connect this GitHub repo. Render reads
   `render.yaml` at the repo root and provisions: `ooh-db` (Postgres),
   `ooh-api` (web), `ooh-jobs` (worker), `ooh-builder` (docker worker),
   `ooh-web` (static).
2. Set the secret env vars (the `sync: false` keys) in the dashboard for
   `ooh-api`, `ooh-jobs`, `ooh-builder`. `SESSION_JWT_SECRET`, `REFRESH_TOKEN_PEPPER`,
   `CSRF_SECRET` auto-generate.
3. First deploy runs `npm run migrate` (preDeploy on ooh-api) → schema applied.
4. Seed once from the ooh-api **Shell**: `npm run seed`. **Immediately change the
   admin password** (log in as `callum.saxon@elevatesl.co.uk` → Settings).
5. Verify `https://api.out-of-house.dev/api/v1/admin/health` (db `ok`, integrations
   `missing` until keyed).

## 3. Stripe
- `npm run stripe:sync` (from ooh-api Shell, with `STRIPE_SECRET_KEY` set) → creates
  products/prices (lookup_key = SKU) + fills `stripe_price_map`.
- Add webhook endpoint `https://api.out-of-house.dev/api/v1/webhooks/stripe` → copy
  the signing secret into `STRIPE_WEBHOOK_SECRET`. Enable the customer portal.

## 4. Resend
- Verify the sending domain `send.out-of-house.dev` (SPF/DKIM/DMARC records → IONOS).
- Inbound route for `in.out-of-house.dev` → `…/api/v1/webhooks/resend-inbound`.
- Set `RESEND_API_KEY` + `RESEND_WEBHOOK_SECRET`. Leave `EMAIL_DRY_RUN=true` for now.

## 5. Cal.com
- Event types (discovery 30m, coaching 60m). API key + webhook →
  `…/api/v1/webhooks/calcom`. Set `CALCOM_*`.

## 6. DNS cutover (IONOS) — keep gh-pages live until verified
- `out-of-house.dev` + `www` → the `ooh-web` static site (Render gives the targets).
- `api.out-of-house.dev` → `ooh-api`.
- Resend SPF/DKIM/DMARC.
- Verify SSL issued (Render auto). Then retire the old gh-pages deploy.

## 7. Flip the switch
- Set `EMAIL_DRY_RUN=false` on ooh-api + ooh-jobs.
- `tsx scripts/smoke.ts https://api.out-of-house.dev` → all green.
- Watch `/app/admin/ops` (health, jobs, alerts) for the first day.

## Rollback
Render → service → **Rollback** to the previous deploy. Migrations are
forward-only; ship a revert migration if a schema change must be undone.
