# out-of-house.dev platform — HANDOVER (v4, Render)

The platform migrated off GitHub Pages + Supabase onto **Render** (compute +
Postgres) with a custom Node backend. Supabase is fully removed.

## Architecture (one repo, one `render.yaml`)
```
apps/web      CRA frontend (marketing + authed platform UI) → talks only to the API
apps/api      Fastify 4 + TS: auth, RBAC, REST, SSE, webhooks, files, admin
apps/jobs     pg-boss worker: ~33 jobs + the orchestrator (Appendix B schedules)
apps/builder  headless Claude Code runner + GitHub/Render clients + PDF
packages/shared  LLM router, evals, shared types
db/           migration runner + 0001 baseline + 0002 v4 + 0003 stripe map + seeds
templates/    ooh-starter-site (Vite), ooh-automation-worker (Node) client starters
render.yaml   (git repo ROOT) Blueprint for db + api + jobs + builder + web
```
Repo nesting: the project lives in `out-of-house-dev/`; `render.yaml` + CI sit at
the git root and target that subfolder (ADR 0001).

## What's done (per phase)
- **0** monorepo + tooling + CI. **1** database (port of all tables, RLS→repo
  scoping, seeds). **2** auth (argon2id, rotating refresh + reuse-detection, CSRF,
  RBAC, files, SSE). **3** domain API (aiseo-audit, stripe checkout/webhook,
  logo-search, cert-issue, apply→approve, CRUD). **4** jobs runtime + portable
  backup/restore. **5** orchestrator (scope→…→deploy, risk, auto-merge, cost caps,
  evals). **6** builder (dry-run runner, GitHub/Render/PDF, 2 templates).
  **7** frontend ported to the API; **Supabase removed**. **8–10** service-line/
  funnel/ops jobs (Appendix B complete). **11** `render.yaml` + stripe-sync + smoke
  + runbooks. **12** cleanup + handover.
- **Tests:** 41 backend tests (vitest, real embedded-postgres) + 15 evals, all
  green; CRA build green; typecheck + lint clean.

## Verify locally
```
cd out-of-house-dev
npm install
npm test          # 41 tests (boots embedded postgres)
npm run evals     # 15
npm run typecheck && npm run lint
npm run build:web # CRA build
```
No Docker needed — tests use the `embedded-postgres` npm package.

## Deploy to Render
Follow `docs/runbooks/go-live.md`: New Blueprint → set the `sync:false` secret env
vars → first deploy runs `npm run migrate` → `npm run seed` once (change the admin
password!) → `npm run stripe:sync` → DNS at IONOS → flip `EMAIL_DRY_RUN=false`.

## Human TODO (the only manual list — Appendix F)
Accounts + keys (each shows `missing` on `/api/v1/admin/health` until set):
Render · GitHub PAT (`GITHUB_TOKEN`/`GITHUB_ORG`) · Anthropic · OpenAI · Stripe
(`stripe:sync` + webhook secret) · Resend (domain + inbound + webhook) · Cal.com ·
Google Places · Companies House · IONOS DNS · *(optional)* Slack, Sentry,
Perplexity, Meta/Google Ads, S3/R2, Brandfetch. For live agent builds + PDF
rasterisation, `npm i @anthropic-ai/claude-agent-sdk puppeteer-core` in
`apps/builder` and set a Chromium path.

## Known gaps / ASSUMED (resumable polish, non-blocking)
- Admin command-centre net-new surfaces + Playwright E2E suites + marketing
  JSON-LD dogfood (Phase 7 polish — existing pages work on the API).
- Service-line jobs (aiseo/ads/logovault/education) are functional-but-degraded
  without their keys; deepen the ranker/ads/vision paths once keyed.
- `email.queue_drain` advances state in dry-run; wire Resend send + rendered
  bodies at go-live (Phase 11 §7).
- ADRs in `docs/adr/`, decisions in `docs/prompts/PROGRESS.md` (the build journal).

## First-week operating guide
Your day: pick leads to call, run the calls, watch `/app/admin` (the command
centre) + one Slack channel. The platform does scope/quote/plan/build/review/
deploy, lead discovery→outreach, reports, backups, uptime, and dunning — with
one-click human gates (PR approve, quote send, capstone confirm, brand approvals).
