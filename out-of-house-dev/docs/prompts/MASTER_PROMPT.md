# OUT-OF-HOUSE.DEV — FULL PLATFORM BUILD · RENDER MIGRATION · MASTER PROMPT

ultrathink

> **How to use this file:** paste the ENTIRE document as your first message to
> Claude Code (Opus 4.8) opened at the repo root. It is one mega-prompt,
> structured into 13 sequential phases, each with a hard verification gate.
> Work through the phases IN ORDER. Never skip a gate. This document is the
> spec, the plan, and the acceptance criteria in one. It is designed to run
> **unattended overnight** — see the Autonomy Charter below.

---

## 0 · OPERATING SYSTEM FOR THIS RUN — read first, obey throughout

### 0.A AUTONOMY CHARTER — this is an unattended overnight run

- **Never stop to ask the user a question.** There is no human watching this
  run. Every open decision you'd normally ask about: decide it yourself using
  the spec, the repo's existing patterns, and boring-but-verifiable defaults;
  record it as a 10-line ADR in `docs/adr/` (or `ASSUMED:` in the relevant PR/
  PROGRESS entry). Questions are a protocol violation; decisions are your job.
- **Unlimited usage.** There is no token, time, or turn budget for this run.
  Use as much usage as the build needs — long phases, repeated verification
  loops, full test runs, re-reads of this spec. Never cut scope, skip tests,
  or shorten a phase to save usage. (Note: the £-cost caps described in §5 and
  Phase 5 are runtime features of the PLATFORM you are building — they do not
  budget or limit this build run itself.)
- **Unlimited subagents.** Spawn as many subagents (Task tool) as useful, in
  parallel wherever work is independent. Recommended pattern per phase:
  explorer subagents to map code before edits; builder subagents for
  independent modules (e.g. separate API route groups, email templates, admin
  pages); a dedicated **verification subagent at every gate** that re-runs the
  gate checklist with fresh eyes and reports ✅/❌ before you commit; a review
  subagent for security-sensitive phases (2, 5, 6, 10). Coordinate results
  yourself; you remain responsible for the integrated outcome.
- **Run to completion.** Work phase by phase until Phase 12's final gate or a
  true hard blocker. A hard blocker is ONLY: a missing credential/account that
  no dry-run flag can route around, or a foundational gate failure (build/
  migrations broken) that survives repeated self-fix attempts. On a hard
  blocker: write `docs/prompts/BLOCKERS.md`, mark the item deferred in
  PROGRESS.md, and — if the blocker is not foundational — CONTINUE with the
  next independent work instead of stopping. Stop entirely only when nothing
  independent remains.
- **Leave a trail.** Maintain `docs/prompts/PROGRESS.md` after every phase
  (status, decisions, deferrals, next step) so the morning review takes
  minutes, not archaeology.

You are the senior staff engineer for out-of-house.dev, executing the v4
platform build: migrating the entire business platform off GitHub Pages +
Supabase onto **Render** (compute + Postgres) with a custom Node backend, and
implementing every automation the business needs so that the only remaining
human inputs are: sales/discovery calls, live coaching/cohort sessions,
one-click approval gates, and senior code review.

**Working rules — these override your defaults:**

1. **Phases are sequential and gated.** At the end of each phase, run the
   GATE checklist (use a verification subagent — §0.A). Every item must pass.
   Then `git commit` with the stated message. If a gate item still fails after
   repeated self-fix loops: log it in `docs/prompts/BLOCKERS.md`, mark it
   deferred in PROGRESS.md, and continue per the Autonomy Charter — stop the
   run only for foundational failures (broken build/migrations). Never paper
   over a failing gate by weakening the check.
2. **Plan inside each phase.** Before writing code in a phase, ultrathink:
   re-read the phase spec, list the files you will create/edit, then execute.
   If a phase is large, do it in sub-slices, verifying as you go.
3. **The repo is the anchor.** `supabase/migrations/*.sql` contains the
   complete current data model — port it, don't reinvent it.
   `src/data/*.js` contains all marketing/catalogue copy — reuse it.
   `src/data/planTemplates.js` (v4) contains the build-handoff prompts and
   style adapters — the orchestrator composes prompts via its `buildHandoff()`.
4. **No mocks where real implementations are specified.** Stubs are allowed
   ONLY behind explicit `*_DRY_RUN` or missing-env guards, and every stub must
   log loudly that it is stubbed and surface in `/api/admin/health` as a
   degraded integration.
5. **Secrets discipline.** Never print, commit, or hardcode secrets. Every
   external call reads from `process.env`. Missing env = feature gracefully
   degrades + health endpoint reports it. `.env.example` stays complete.
6. **Money and email are sacred.** Anything that charges a card or sends an
   email to a non-`@out-of-house.dev` address must: be idempotent, respect a
   dry-run flag (`EMAIL_DRY_RUN`, default true until Phase 11), be rate-limited,
   and write an audit row.
7. **Tests are the contract.** Each phase's gate names its tests. Unit tests
   with Vitest, API tests against a real Postgres (use `DATABASE_URL_TEST`),
   E2E with Playwright. Never weaken or skip a test to pass a gate.
8. **TypeScript on the backend** (`apps/api`, `apps/worker`), JS stays fine in
   the existing CRA frontend. Strict mode on. `zod` validates every API input
   and every LLM JSON output.
9. **Keep the existing UI working.** The CRA app in `src/` is the frontend.
   You are swapping its data layer (supabase-js → our API client) and adding
   pages — not redesigning it. Reuse `styles/v3.css` patterns for new pages.
10. **Commit style:** conventional commits. One commit per phase minimum,
    more where logical. Final commit message of phase N: `feat(phase-N): <title>`.
11. **Write down decisions.** Anything you decide that the spec left open goes
    in `docs/adr/` as a 10-line ADR. Anything assumed gets `ASSUMED:` prefix.
12. **When the spec references an external account/key you don't have** (e.g.
    Slack bot token), build the integration complete-but-degraded behind env
    detection. Appendix F is the human's account checklist — your job is that
    code works the moment a key lands in env, with zero code changes.

---

## 1 · BUSINESS CONTEXT — what this platform runs

out-of-house.dev is a senior-engineer agency operated by one person (Callum)
with an AI-automated delivery platform. **Eleven revenue lines:**

| # | Line | Price | Route |
|---|---|---|---|
| 1 | AI automations (flagship) | £750–£20k fixed | `/services/ai-automations` |
| 2 | Websites & landing pages | £500 + £100/mo care | `/services/websites` |
| 3 | Web apps & SaaS builds | from £4k | `/services/web-apps` |
| 4 | Custom internal software | £3k–£50k | `/services/custom-software` |
| 5 | AI growth / lead engine (bespoke) | custom | `/services/ai-growth` |
| 6 | Maintenance retainer | from £1.5k/mo | `/services/maintenance` |
| 7 | AI coaching (business + developers) | £100/hr + programmes | `/coaching` |
| 8 | Courses (3/6/12-week cohorts) | £395–£6,500 | `/courses` |
| 9 | SaaS — LogoVault (live), Prompt Locker, Inbox Fox, Fingerprint Fund | £0–£149/mo | `/saas` |
| 10 | Lead engine as a service | £500–£4k setup + £250–£2k/mo | `/lead-engine` |
| 11 | AISEO (Generative Engine Optimisation) | £0 audit; £1.5k/£3.5k + £500/£1.5k/mo | `/aiseo` |

**Deliberately human (never automate — design AROUND them):**
discovery/sales calls; live cohort sessions; 1:1 coaching delivery; the
post-grad bench interview; DMCA takedown legal review; final senior review on
standard/high-risk merges; relationship-led citation outreach and client
support (AI drafts everything, a human owns the send).

**Everything else must run hands-off**, with single-click human gates where
judgement is cheap: outreach draft approval (until per-ICP auto-mode),
capstone grade approval, LogoVault brand approvals under 0.9 confidence,
quote sign-off, and PR review.

North-star ops metric: **senior-hours per unit of revenue down every quarter.**
Success condition: Callum's day = pick leads to call, run calls, answer one
Slack channel. The platform does the rest.

---

## 2 · CURRENT STATE OF THE REPO (ground truth)

- CRA React 18 app (`src/`), `BrowserRouter`, deployed today via gh-pages
  (`.github/workflows/github-pages.yml`, `public/CNAME` = out-of-house.dev).
- Marketing pages for all 11 lines exist and are styled (`src/pages/*`,
  `src/data/{services,programmes,saasApps,leadgen,aiseo}.js`, `styles/v3.css`).
- Authed platform at `/app/*`: client/dev/admin dashboards, projects, requests,
  kanban board, plan library (`/app/plans`), admin applications/users/audit,
  documents room, notifications, billing page (`src/pages/app/**`).
- Data layer: `src/lib/supabase.js` + supabase-js calls spread through pages,
  plus `src/lib/{AuthProvider,documents,notifications,realtime,uploads,mentions,toast}.js`.
- Supabase artifacts to MIGRATE OFF: `supabase/migrations/001..006.sql`
  (~46 tables/views — port to our own Postgres), `supabase/functions/*`
  (13 Deno edge functions — port to API routes + jobs; their logic is the spec).
- `src/data/planTemplates.js` **v4 already updated**: 8 template types
  (website, automation, web_app, custom_software, platform, maintenance,
  aiseo, lead_engine), `CLAUDE_HANDOFFS`, `STYLE_ADAPTERS`, `AUTOMATION_CONTRACT`,
  `buildHandoff(type, style, context)`. Use it; don't fork it.
- `scripts/seed.js` seeds demo users/projects/templates (Supabase client —
  port in Phase 1). `scripts/build-roadmap-pdf.js` renders PDFs via headless Chrome.
- Planning library (business source of truth) lives in a sibling folder;
  key facts are restated in this prompt — you don't need it.

---

## 3 · TARGET ARCHITECTURE — everything on Render

One monorepo, one `render.yaml` Blueprint, one push = whole platform deploys.

```
┌─────────────────────────── Render ───────────────────────────────┐
│                                                                   │
│  [static site] apps/web      — CRA build (marketing + platform UI)│
│      out-of-house.dev                                             │
│                                                                   │
│  [web service] apps/api      — Fastify + TS. Auth, REST, SSE,     │
│      api.out-of-house.dev      webhooks, MCP endpoint, uploads    │
│      (persistent disk /var/data for file storage)                 │
│                                                                   │
│  [worker] apps/jobs          — pg-boss consumer + ALL cron        │
│      schedules (lead engine, digests, ranker, reconciliation,     │
│      uptime, backups, ads, certs, reports, alerts)                │
│                                                                   │
│  [worker] apps/builder       — Claude Code worker (Agent SDK,     │
│      Docker runtime: node20 + git + chromium). Consumes build     │
│      queue, clones repos, runs handoffs, opens PRs, previews,     │
│      renders PDFs, deploys client sites via Render API            │
│                                                                   │
│  [postgres] ooh-db           — single Postgres (app schema +      │
│      pg-boss schema). Daily backups + nightly pg_dump to disk     │
└───────────────────────────────────────────────────────────────────┘
        │                    │                     │
   Stripe (payments)   Anthropic (LLM + Agent SDK)  Resend (email out + INBOUND)
   Cal.com (booking)   OpenAI (fallback LLM)        GitHub (repos, PRs)
   Google Places / Companies House / Reddit (lead sources)
   Meta + Google Ads (adapters, env-gated)          IONOS (DNS only)
```

**Architecture decisions (treat as ADRs, already made):**

- **A1 — Auth**: own auth in `apps/api`. argon2id password hashing, magic-link
  + password + optional Google OAuth. Short-lived JWT access token (15 min,
  `jose`) in an httpOnly `__Host-ooh_at` cookie + rotating refresh token
  (30 days) in `__Host-ooh_rt`, server-side session rows (revocable).
  CSRF: double-submit token on state-changing routes. Roles: `client`,
  `developer`, `admin` on `users.role`.
- **A2 — Authorization replaces RLS**: every query goes through repository
  functions that take a `Viewer` (user id + role) and scope SQL accordingly.
  A red-team test suite proves cross-account isolation per resource. Admin
  endpoints separate + audited.
- **A3 — Jobs**: `pg-boss` v10 on the same Postgres. All schedules in code
  (one source of truth, Appendix B). No Render cron services needed.
- **A4 — Realtime**: SSE endpoint (`GET /api/realtime`) pushing notification +
  activity events per user; frontend falls back to 30s polling.
- **A5 — Storage**: driver interface `FileStore` with `disk` driver (Render
  persistent disk at `/var/data`, served via authenticated API streaming) and
  optional `s3` driver (R2/S3, env-gated). Buckets→prefixes: attachments,
  documents, voice, avatars, logovault, reports, backups.
- **A6 — LLM router**: port `_shared/llm.ts` to `packages/shared/llm.ts`.
  Models: `claude-opus-4-8` (planning/build prompts), `claude-sonnet-4-6`
  (scoping/drafting/review), `claude-haiku-4-5-20251001` (scoring/classify),
  OpenAI fallback. Per-call: tokens, cost GBP, purpose tag → `llm_calls` table.
  Per-function daily cost caps from env (`LLM_DAILY_CAP_GBP`, default 50).
- **A7 — Claude Code worker**: `@anthropic-ai/claude-agent-sdk` headless with
  `ANTHROPIC_API_KEY`. One run at a time per repo; global concurrency 2.
  GitHub access via fine-grained PAT (`GITHUB_TOKEN`) — App later.
- **A8 — PDF**: `puppeteer` (bundled chromium) in `apps/builder` Docker image.
  HTML templates in `packages/shared/templates/pdf/*`.
- **A9 — Frontend stays CRA** and talks ONLY to `apps/api` via
  `src/lib/api.js`. `REACT_APP_API_URL` env. supabase-js is fully removed.
- **A10 — Client sites we host**: each = its own GitHub repo (from template) +
  its own Render static site, created programmatically via Render API; tracked
  in `client_sites`; uptime-checked by jobs; billed via Stripe care plan.

---

## 4 · GLOBAL CONVENTIONS

- **Monorepo layout** (npm workspaces, root `package.json`):
  ```
  apps/web/        ← the existing CRA app moves here (src/, public/)
  apps/api/        ← Fastify + TS  (src/routes, src/services, src/repos, src/lib)
  apps/jobs/       ← pg-boss schedules + consumers (thin: imports from packages)
  apps/builder/    ← Claude Code worker + PDF + Render-API deployer (Dockerfile)
  packages/shared/ ← llm.ts, types, zod schemas, email templates, pdf templates,
                     prompt modules library, constants (pricing/SKUs)
  db/migrations/   ← 0001_baseline.sql ... (plain SQL, ordered)
  db/seeds/        ← seed.ts (idempotent)
  scripts/         ← stripe-sync.ts, dev.sh, smoke.ts
  render.yaml
  ```
- **API shape**: REST, JSON, `/api/v1/*`. Errors: `{ error: { code, message } }`,
  correct HTTP codes. Every route: zod-validated body/query/params; auth
  middleware unless explicitly public; rate limit (default 100/min/IP public,
  600/min authed; auth endpoints 10/min).
- **DB**: snake_case, `uuid` PKs (`gen_random_uuid()`), `created_at`/`updated_at`
  + trigger, FK indexes always. Money: integer pence + `_gbp` numeric only in
  views. All timestamps `timestamptz`.
- **Naming**: jobs `domain.action` (e.g. `leads.discover`), events
  `domain.entity.verb`, queues match job names.
- **Logging**: pino JSON logs; every request gets `req_id`; every job run gets
  `job_run` log pair (start/finish with ms + outcome).
- **Email**: ALL outbound through `packages/shared/email.ts` →
  `email_events` row per send + Resend webhook updates (delivered/bounced/
  complained). Templates in `packages/shared/templates/email/*.tsx` (react-email
  or simple HTML functions — your choice, ADR it).
- **Frontend data**: `src/lib/api.js` exposes `api.get/post/put/del` +
  `useApi()` hooks; auth state via rewritten `AuthProvider` (`/me`, login,
  logout, magic link); SSE client in `src/lib/realtime.js` (same exported
  surface as today so pages need minimal edits).

---

## 5 · ENVIRONMENT VARIABLE MATRIX (complete — also write to `.env.example`)

```
# Core
NODE_ENV, PUBLIC_SITE_URL=https://out-of-house.dev, PUBLIC_API_URL=https://api.out-of-house.dev
DATABASE_URL (Render injects), DATABASE_URL_TEST
SESSION_JWT_SECRET, REFRESH_TOKEN_PEPPER, CSRF_SECRET   # generate 32-byte hex
FILE_STORE=disk, FILE_STORE_ROOT=/var/data, (optional) S3_ENDPOINT/S3_BUCKET/S3_KEY/S3_SECRET

# LLM
ANTHROPIC_API_KEY            # console.anthropic.com → API keys
OPENAI_API_KEY               # platform.openai.com (fallback router)
LLM_DAILY_CAP_GBP=50, BUILDER_RUN_CAP_GBP=8

# Payments
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PORTAL_RETURN_URL

# Email
RESEND_API_KEY, RESEND_WEBHOOK_SECRET, EMAIL_FROM="out-of-house.dev <hello@send.out-of-house.dev>"
EMAIL_DRY_RUN=true           # flip false at go-live
INBOUND_ADDRESS=reply@in.out-of-house.dev

# Booking
CALCOM_API_KEY, CALCOM_WEBHOOK_SECRET, CALCOM_EVENT_DISCOVERY, CALCOM_EVENT_COACHING

# Builder / delivery
GITHUB_TOKEN                 # fine-grained PAT: repo admin on org
GITHUB_ORG=out-of-house-dev
RENDER_API_KEY               # dashboard → Account Settings → API Keys
RENDER_OWNER_ID              # workspace id (tea-...)
BUILDER_CONCURRENCY=2, BUILDER_DRY_RUN=false

# Lead sources
GOOGLE_PLACES_API_KEY, COMPANIES_HOUSE_API_KEY
REDDIT_USER_AGENT="ooh-lead-engine/1.0"

# Ads (env-gated adapters; dry-run without)
META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, GOOGLE_ADS_DEVELOPER_TOKEN,
GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID

# Comms / alerts
SLACK_BOT_TOKEN, SLACK_ADMIN_CHANNEL_ID, SLACK_WEBHOOK_ALERTS   # optional, degrade gracefully
ADMIN_ALERT_EMAIL=callum.saxon@elevatesl.co.uk

# OAuth (optional)
GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET

# Observability (optional)
SENTRY_DSN_API, SENTRY_DSN_WEB

# AISEO ranker engines (env-gated; skip engines without keys)
PERPLEXITY_API_KEY
```

Rule: **zero code changes between "key absent" and "key present"** — presence
flips the integration live.

---

# PHASE 0 · PREFLIGHT + MONOREPO RESTRUCTURE

**Objective:** repo becomes the monorepo above; existing CRA app still builds
green; tooling and CI in place.

**Build:**

1. Create npm workspaces root `package.json` (`workspaces: ["apps/*","packages/*"]`),
   `"engines": { "node": ">=20" }`. Root scripts: `dev`, `build`, `test`, `lint`,
   `typecheck`, `migrate`, `seed`, `stripe:sync`, `smoke`.
2. Move the CRA app into `apps/web` (src/, public/, its package.json). Keep
   `react-scripts`; do NOT eject; do NOT redesign. Fix relative paths.
   Remove `gh-pages` dep + `predeploy/deploy` scripts + `homepage` field
   (Render serves at root). Delete `.github/workflows/github-pages.yml`
   (replaced in this phase) and `public/CNAME` (Render manages the domain).
3. Scaffold `apps/api` (Fastify 4 + TypeScript strict + tsx dev runner +
   esbuild/tsc build), `apps/jobs`, `apps/builder` (with Dockerfile:
   `node:20-bookworm` + git + chromium deps for puppeteer), `packages/shared`.
4. Tooling: ESLint flat config + Prettier across workspaces; Vitest at root;
   Playwright in `apps/web` (config pointing at local stack); `tsconfig.base.json`.
5. Port `packages/shared/llm.ts` from `supabase/functions/_shared/llm.ts`
   (same router; add `purpose` tag, cost cap check, `llm_calls` persistence
   hook injected by callers; model ids per A6).
6. `scripts/dev.sh`: starts Postgres (docker or local), runs migrations,
   seeds, starts api + jobs + web concurrently.
7. New CI `.github/workflows/ci.yml`: install → lint → typecheck → unit tests
   → build all workspaces. (Deploys happen via Render auto-deploy, not Actions.)
8. Write `docs/adr/0001-render-migration.md` summarising A1–A10.

**GATE 0**
- [ ] `npm install` at root succeeds; workspaces resolve.
- [ ] `npm run build -w apps/web` produces the CRA build (UI unchanged).
- [ ] `npm run dev -w apps/api` serves `GET /api/v1/health` → `{ ok: true }`.
- [ ] `npm run lint && npm run typecheck` green.
- [ ] CI workflow file valid (run `npx yaml-lint` or equivalent check).
- [ ] Commit: `feat(phase-0): monorepo restructure + tooling`

---

# PHASE 1 · DATABASE — BASELINE SCHEMA, MIGRATION RUNNER, SEEDS

**Objective:** one squashed baseline migration containing the ENTIRE data
model (ported from Supabase + new v4 tables), a tiny migration runner, and an
idempotent seed.

**Build:**

1. **Migration runner** `db/migrate.ts`: applies `db/migrations/*.sql` in
   filename order inside transactions, records in `schema_migrations`
   (filename, checksum, applied_at). Refuses checksum drift. `npm run migrate`.
2. **`db/migrations/0001_baseline.sql`** — port EVERY table from
   `supabase/migrations/001..006` with these transformations:
   - `profiles` becomes **`users`**: `id uuid pk default gen_random_uuid()`,
     `email citext unique not null`, `password_hash text`, `full_name`,
     `role text check (role in ('client','developer','admin')) default 'client'`,
     `notify_email bool default true`, `notify_in_app bool default true`,
     `timezone text`, `avatar_path text`, `last_login_at timestamptz`,
     `created_at/updated_at`. Every FK that referenced `profiles(id)` /
     `auth.users` now references `users(id)`.
   - DROP all `create policy` / `enable row level security` / `auth.uid()`
     statements (authorization moves to the API layer).
   - Keep every CHECK constraint, index, trigger, view (port
     `certificate_verifications` view as-is minus RLS).
   - Table inventory to port (verify against the SQL files; this list is the
     contract): applications, projects (+ `metadata jsonb` from 006),
     feature_requests, request_comments, plan_templates (8-type check from 006),
     project_plans, notifications, activity_events, attachments, decisions,
     digests, monthly_reports, changelog_entries, audit_events, guest_tokens,
     referrals, subscriptions, automation_runs, project_documents, programmes,
     cohorts, enrollments, cohort_sessions, certificates, coaching_bookings,
     payments, saas_apps, logovault_brands, logovault_assets, api_keys,
     api_usage, lead_icps, lead_sources, leads, lead_signals,
     outreach_campaigns, outreach_messages, ad_campaigns, ad_creatives,
     ad_performance, claude_runs, waitlist, aiseo_audits, aiseo_subscriptions,
     aiseo_rankings.
3. **`db/migrations/0002_v4_platform.sql`** — NEW tables:
   - Auth/infra: `sessions` (user_id, refresh_hash, ua, ip, expires_at,
     revoked_at), `auth_tokens` (purpose check: magic|reset|invite|guest,
     token_hash, user_id null for invites, email, expires_at, used_at),
     `oauth_identities` (provider, provider_user_id, user_id).
   - Commerce: `quotes` (application_id, project_id null, status
     draft|sent|accepted|declined|expired, line_items jsonb, total_pence,
     deposit_pct int default 50, sow_md text, valid_until, accepted_at,
     acceptance_ip, acceptance_name), `stripe_events` (id text pk — event id,
     processed_at) for webhook idempotency.
   - Hosting: `client_sites` (project_id, repo_url, render_service_id,
     render_url, custom_domain, dns_records jsonb, status, care_subscription_id),
     `uptime_checks` (target_url, client_site_id null, interval_s default 300,
     enabled), `uptime_results` (check_id, ts, ok, status_code, latency_ms),
     `status_incidents` (started_at, resolved_at, title, body, severity).
   - Growth: `suppression_list` (email citext unique, reason, source, created_at),
     `inbound_emails` (resend_id, from_email, to_email, subject, text_body,
     html_body, in_reply_to, lead_id null, intent text null, processed_at),
     `meeting_bookings` (calcom_uid, kind discovery|coaching|aiseo|lead_engine,
     email, name, starts_at, ends_at, lead_id null, application_id null,
     status), `testimonials` (project_id, client_name, quote, rating int,
     approved bool default false, public bool), `case_studies` (project_id,
     slug unique, title, body_md, status draft|approved|published),
     `referral_credits` (referral_id, amount_pence, status).
   - Education: `capstone_submissions` (enrollment_id, repo_url, notes,
     llm_review_md, llm_grade, senior_grade, status submitted|reviewed|passed|failed).
   - Ops: `admin_alerts` (severity info|warn|critical, kind, title, body,
     acknowledged_at), `llm_calls` (purpose, model, tokens_in, tokens_out,
     cost_pence, ref_kind, ref_id, created_at), `analytics_events` (session_id,
     user_id null, name, path, props jsonb, ts) partitioned monthly or indexed
     by ts, `email_events` (resend_id, to_email, template, status
     queued|sent|delivered|bounced|complained, ref_kind, ref_id, ts),
     `files` (path unique, store, size, mime, owner_id, scope, created_at),
     `backups_log` (kind, path, bytes, ok, ts), `feedback` (user_id, page,
     body, created_at), `content_posts` (slug unique, kind blog|changelog,
     title, body_md, status draft|approved|published, published_at).
   - Helpful views: `v_llm_costs_daily`, `v_revenue_monthly` (payments),
     `v_funnel_weekly` (applications→quotes→projects counts).
4. **Seed `db/seeds/seed.ts`** (port of scripts/seed.js, idempotent upserts):
   admin `callum.saxon@elevatesl.co.uk` (env-overridable password, force-change
   flag), demo developer + client, demo project + 5 feature_requests,
   **all 8 plan templates** from `src/data/planTemplates.js` (require it
   directly), programmes/courses from `src/data/programmes.js`, saas_apps from
   `src/data/saasApps.js`, lead_sources (places, companies_house, reddit, news
   — enabled false until keys), our own 2 ICPs ('UK SMB no website',
   'UK aspiring AI engineer') with starter prompts, default outreach campaign
   (approval_mode manual, send_rate 20), 10 starter logovault brands,
   uptime check for out-of-house.dev itself.
5. Delete nothing in `supabase/` yet (reference until Phase 12 cleanup).

**GATE 1**
- [ ] Fresh DB: `npm run migrate` applies 0001+0002 clean; re-run = no-op.
- [ ] `npm run seed` twice = idempotent (second run changes nothing).
- [ ] Smoke SQL: counts > 0 for users, plan_templates (=8), programmes,
      lead_icps, saas_apps; `select * from v_funnel_weekly` runs.
- [ ] Vitest: migration checksum-drift test; seed idempotency test.
- [ ] Commit: `feat(phase-1): baseline schema + v4 tables + seeds`

---

# PHASE 2 · API FOUNDATION — AUTH, SESSIONS, RBAC, FILES, SSE

**Objective:** a hardened Fastify API with full auth lifecycle and the
cross-cutting services every later phase uses.

**Build:**

1. **Fastify bootstrap**: helmet-equivalent headers, CORS locked to
   PUBLIC_SITE_URL (+ localhost dev), cookie plugin, rate-limit plugin,
   multipart, pino logger with req_id, global error handler (zod errors → 400).
2. **Auth routes** `/api/v1/auth/*`:
   - `POST /register` (invite-only by default: requires valid invite token OR
     first-admin bootstrap when users table empty), `POST /login` (argon2id,
     constant-time, lockout: 10 fails/15 min), `POST /logout` (revoke session),
     `POST /refresh` (rotate refresh token, reuse-detection → revoke family),
     `POST /magic/request` + `POST /magic/consume` (15-min single-use tokens,
     via email service), `POST /password/forgot` + `POST /password/reset`,
     `GET /me`, `PATCH /me` (profile fields), `POST /me/password`.
   - Google OAuth (env-gated): `GET /oauth/google` + callback → upsert
     oauth_identities, link by verified email.
   - Guest access: `POST /guest/consume` validates `guest_tokens` for a
     request/project read-only view (parity with current feature).
3. **RBAC + Viewer**: `requireAuth`, `requireRole('admin')` etc. decorators;
   `Viewer` object injected; repository layer in `src/repos/*` takes Viewer and
   scopes every query (clients: own rows; developer: delivery surfaces; admin: all).
4. **CSRF**: issue `XSRF-TOKEN` cookie; verify header on POST/PUT/PATCH/DELETE
   except webhook + public form routes (which use signatures/captcha instead).
5. **Files**: `FileStore` driver (A5); routes `POST /api/v1/files`
   (auth, multipart, size/mime limits per scope) and `GET /api/v1/files/*path`
   (authorization by scope: avatars public-cacheable; documents/attachments by
   project membership; reports by ownership). Port `src/lib/uploads.js` +
   `documents.js` calls to these.
6. **SSE realtime**: `GET /api/v1/realtime` (auth) — per-user channel;
   in-process pubsub + Postgres LISTEN/NOTIFY (`notify_user(user_id, payload)`
   SQL helper) so jobs/api both publish. Heartbeat every 25s.
7. **Notifications service**: `notify(userId, {kind,title,body,link})` →
   notifications row + SSE push + (if user.notify_email) queued email.
8. **Audit**: `audit(viewer, action, target, meta)` helper → audit_events.
9. **Admin health**: `GET /api/v1/admin/health` — db, pg-boss queue depths,
   integration statuses (stripe/resend/anthropic/github/render/slack/ads:
   configured|missing|error+last_ok), disk usage, EMAIL_DRY_RUN state.
10. **First-party analytics collector**: `POST /api/v1/collect` (public,
    rate-limited, no cookies — session_id generated client-side, no PII) →
    analytics_events. Tiny `apps/web/src/lib/analytics.js` sender (pageviews +
    custom events), wired into App.js route changes.

**GATE 2**
- [ ] API test suite (Vitest + real test DB): register→login→me→refresh→logout;
      magic-link round trip (dry-run email captured); lockout; CSRF rejection;
      guest token read-only path.
- [ ] **Isolation red-team suite v1**: client A cannot read client B's
      project/request/document/notification by id (404/403), cannot list them,
      cannot write them. Developer can read both; admin can manage.
- [ ] File upload→download round trip with scope enforcement test.
- [ ] SSE: integration test receives a notify() push.
- [ ] `GET /admin/health` reports every integration as `missing` (no keys yet)
      without crashing.
- [ ] Commit: `feat(phase-2): api foundation (auth, rbac, files, sse, analytics)`

---

# PHASE 3 · DOMAIN API — PORT ALL 13 EDGE FUNCTIONS + PLATFORM ROUTES

**Objective:** every Supabase edge function becomes an API route or job
handler with feature parity or better; every page in `apps/web` has the
endpoints it needs.

**Port map (edge function → new home):**

| Edge function | New home | Notes |
|---|---|---|
| claude-orchestrate | `services/orchestrator.ts` + job `orchestrate.stage` | Phase 5 expands it |
| stripe-checkout | `POST /api/v1/checkout` | port product_ref resolution (course/coaching/saas/retainer/lead_engine/aiseo/care), price from server-side catalogue (Appendix A) — never trust client amounts |
| stripe-webhook | `POST /api/v1/webhooks/stripe` | signature verify; `stripe_events` idempotency; fan-out: payments→succeeded, enrollments upsert+cohort placement, coaching_bookings, subscriptions, invoice.payment_failed → dunning alert + client email |
| logo-search | `GET /api/v1/logovault/search` | public + optional api_key auth; rate limit by key tier; api_usage metering row |
| aiseo-audit | `POST /api/v1/aiseo/audit` | port all 14 checks verbatim from the Deno source; public, rate-limited, captcha-guarded; stores aiseo_audits + (new) fires `funnel.audit_completed` event |
| cert-issue | `POST /api/v1/admin/certificates` + auto via jobs | port OH- code gen; add PDF render job + email |
| lead-discover | job `leads.discover` | port adapters (places/companies_house/reddit) + add `news` RSS adapter; per-source enabled/config |
| lead-enrich | job `leads.enrich` | port: fetch site, meta, platform detect |
| lead-score | job `leads.score` | port haiku scoring, strict JSON, threshold per ICP |
| outreach-draft | job `outreach.draft` | port sonnet drafting w/ voice_prompt + signal reference; suppression check |
| outreach-send | job `outreach.send` | port rate-limit per campaign/day; suppression re-check; List-Unsubscribe header + link; email_events row |
| ads-generate | `POST /api/v1/admin/ads/generate` → job | port variant generation |
| digest-weekly | job `reports.digest_weekly` | port; per-project Sonnet summary email Mondays 07:00 Europe/London |

**Additional platform routes (everything the UI uses today via supabase-js):**
applications (public `POST /api/v1/apply` with captcha + honeypot; admin list/
review/approve→invite+project), projects + feature_requests + comments CRUD
(viewer-scoped), kanban board data, plan_templates list/detail, project_plans
spawn/progress, documents room (project_documents + visibility), notifications
list/read, activity feed, changelog public list, decisions, subscriptions view,
billing summary (client), waitlist `POST` (public, captcha), referrals create/
list, settings. Mirror current UI needs exactly — grep `apps/web/src` for every
`supabase.` call and cover each one.

**New public routes:** `POST /api/v1/forms/contact` (client-site contact relay
→ project owner email), `GET /api/v1/verify/:code` (certificate verify),
`GET /api/v1/status` (public uptime/status JSON), `GET /api/v1/live` (anonymised
stats for /live page: builds shipped, automations live, certs issued).

**Inbound email:** `POST /api/v1/webhooks/resend` (outbound events:
delivered/bounce/complaint → email_events + suppression on complaint/hard
bounce) and `POST /api/v1/webhooks/resend-inbound` (email.received → store
inbound_emails; job `inbox.parse` classifies intent — Phase 8 wires actions).

**Cal.com:** `POST /api/v1/webhooks/calcom` (BOOKING_CREATED/CANCELLED →
meeting_bookings; link to lead/application by email; notify admin; fire
`funnel.meeting_booked`).

**GDPR:** `GET /api/v1/me/export` (zip of user's rows + files),
`POST /api/v1/me/delete` (soft-delete + 30-day purge job), suppression honoured
everywhere.

**GATE 3**
- [ ] Route inventory doc `docs/api.md` auto-generated (route table) and every
      `supabase.` reference in apps/web has a mapped endpoint (grep proves 0 left
      unmapped — list any intentional gaps).
- [ ] Vitest API tests: apply→approve→invite flow; checkout session creation
      (Stripe test mode or stub flag) + webhook idempotency (same event twice =
      one payment row); logo search metering; aiseo audit on a fixture HTML
      server hits all 14 checks both pass and fail paths.
- [ ] Isolation suite extended to new resources.
- [ ] Commit: `feat(phase-3): domain api (edge-function ports + platform routes)`

---

# PHASE 4 · JOBS RUNTIME — PG-BOSS, SCHEDULES, OPS CRONS

**Objective:** `apps/jobs` runs every queue consumer + schedule from Appendix B
with retries, visibility, and alerts.

**Build:**

1. pg-boss bootstrap (own schema `pgboss`); typed `defineJob(name, schema,
   handler, opts)` helper: zod payload validation, pino logging, failure →
   retry (expo backoff, per-job attempts), final-failure → admin_alerts +
   email/Slack.
2. Register ALL schedules from Appendix B in one `schedules.ts` (cron strings,
   Europe/London).
3. Ops jobs now: `ops.uptime_check` (every 5 min: ping enabled uptime_checks,
   write results, open/close status_incidents on 3-fail/3-ok, alert on open),
   `ops.backup_nightly` (pg_dump to FileStore backups/ + prune >14d + log),
   `ops.cost_rollup_daily` (llm_calls → v_llm_costs check vs caps → alert),
   `ops.stripe_reconcile_nightly` (list yesterday's Stripe charges/invoices vs
   payments rows; mismatch → admin_alerts), `ops.disk_watch` (>80% → alert),
   `email.queue_drain` (send queued emails respecting EMAIL_DRY_RUN; dry-run
   writes .eml files to FileStore for inspection).
4. Wire Phase 3 job ports onto their schedules (leads.*, outreach.*,
   reports.digest_weekly).
5. `GET /api/v1/admin/jobs` — queue depths, recent failures, next scheduled
   runs; `POST /api/v1/admin/jobs/:name/run` — manual trigger (audited).

**GATE 4**
- [ ] Integration test: enqueue each registered job with a valid payload — all
      handlers execute (external calls stubbed via env-missing degradation).
- [ ] Kill-and-retry test: a handler that throws twice succeeds on third try.
- [ ] Final-failure path writes admin_alerts (test).
- [ ] `ops.backup_nightly` produces a restorable dump (restore into test DB).
- [ ] Commit: `feat(phase-4): jobs runtime + schedules + ops crons`

---

# PHASE 5 · ORCHESTRATOR V2 — SCOPE → QUOTE → PLAN → BUILD-PROMPT → REVIEW → DEPLOY

**Objective:** the build pipeline as a state machine with telemetry, cost
caps, risk classification, an auto-merge policy engine, and prompt composition
from `planTemplates.js`.

**Build:**

1. **State machine** on `feature_requests.status`:
   `submitted → scoped → quoted(optional) → planned → building → review →
   approved → deploying → shipped` (+ `rejected`, `blocked`). Transitions only
   via `services/orchestrator.ts`; every transition writes activity_events +
   notifies the client.
2. **Stages** (each idempotent per (request_id, kind), each a claude_runs row
   with prompt, result_md, tokens, cost — port the existing stage prompts and
   keep their intent):
   - `scope` (sonnet): 1-page scope; problem, ship/not-ship, acceptance
     criteria, risks. Auto-runs on submit. → status scoped, client sees it.
   - `quote` (NEW, sonnet + price book): for non-retainer projects — line
     items from Appendix A price book + effort estimate; drafts `quotes` row
     (status draft) for admin one-click send. Skipped for retainer requests.
   - `plan` (opus): file-level plan, data changes, verification checklist.
     Auto-runs when scope approved (or quote accepted).
   - `build_prompt` (opus): compose via `buildHandoff(project_type,
     metadata.style, context)` from `src/data/planTemplates.js` + the plan +
     repo conventions → the exact prompt for the builder worker. Enqueue
     `builder.run`.
   - `review` (sonnet): on PR opened (builder callback): structured review +
     `status: pass | needs_changes` + **risk classification** (low|standard|high
     from diff paths + size + keywords: auth/billing/migration/email ⇒ high).
   - `deploy` (haiku): on merge: runbook md; trigger smoke test job; mark shipped.
3. **Auto-merge policy engine** `services/mergePolicy.ts`:
   `eligible = risk==='low' && llmReview==='pass' && ci==='green' &&
   project.metadata.auto_merge !== false && globalKillSwitch off`.
   Eligible → builder merges PR + logs `automerged=true`; else → senior review
   queue (admin UI, Phase 7). Kill switch: `settings` row + admin toggle.
4. **Cost caps**: per-run cap `BUILDER_RUN_CAP_GBP`; per-day cap
   `LLM_DAILY_CAP_GBP` across llm_calls; breach → stage status `cancelled`,
   admin_alert, client-safe message.
5. **Eval harness** `packages/shared/evals/`: golden fixtures for scope/plan/
   review prompts (5+ each); `npm run evals` scores outputs (structure
   present, status line parseable, no hallucinated file paths) — used in CI to
   catch prompt regressions.
6. **Failure policy** (port + extend): LLM timeout retry ×2 expo; worker
   can't apply → PR `[NEEDS HUMAN]`; reviewer disagreement → manual review.

**GATE 5**
- [ ] State-machine unit tests: every legal/illegal transition.
- [ ] Full pipeline integration test with stubbed LLM (fixture responses):
      submit → scoped → planned → build prompt composed (contains the style
      adapter + AUTOMATION_CONTRACT text) → fake PR → review parsed → risk
      classified → merge policy decision correct on a low-risk and a high-risk
      fixture diff.
- [ ] Idempotency: re-running a stage reuses the existing claude_run.
- [ ] Cost-cap breach test → cancelled + alert.
- [ ] `npm run evals` green.
- [ ] Commit: `feat(phase-5): orchestrator v2 (quote, risk, automerge, evals)`

---

# PHASE 6 · BUILDER WORKER — HEADLESS CLAUDE CODE + DEPLOYER + PDF

**Objective:** `apps/builder` turns build prompts into merged PRs and live
deployments without a human keyboard.

**Build:**

1. **Runner** (`@anthropic-ai/claude-agent-sdk`): consume `builder.run`
   {claude_run_id, repo_url, branch, prompt, caps}. Steps:
   clone (depth 1) into a fresh workdir → create branch per AUTOMATION_CONTRACT
   → run the agent with the composed prompt, tools enabled (file edit, bash),
   `cwd` = workdir, max-turns + token budget from caps → parse the final
   summary json block → run verification commands (from project config:
   default `npm run lint && npm run build && npm test --if-present`) → commit
   → push → open PR via GitHub API (body per protocol) → write back
   claude_runs (pr_url, tokens, cost, duration, status awaiting_review) →
   notify orchestrator (`orchestrate.stage` review).
2. **Safety rails**: global concurrency BUILDER_CONCURRENCY; per-repo lock;
   workdir wiped after run; 30-min hard timeout; cost cap abort; the agent
   NEVER gets platform DB creds — only repo + explicitly whitelisted env;
   secrets scrubbed from logs; BUILDER_DRY_RUN → do everything except push/PR
   (write diff to FileStore for inspection).
3. **Preview environments**: for client_sites/static repos — push branch →
   create/refresh a Render preview (or `<branch>--preview` static site via
   API) and record preview_url on the claude_run. For the platform repo
   itself rely on Render Blueprint previews (Phase 11).
4. **Merge executor**: `builder.merge` {pr_url} — squash-merge via API when
   merge policy says eligible (or admin clicks Approve), delete branch.
5. **Render deployer** `services/renderDeploy.ts` (Render API v1):
   `createStaticSite(repo, name)` → service; `addCustomDomain(serviceId,
   domain)` → returns required DNS records (store on client_sites.dns_records;
   email/SMS the records summary to admin for IONOS entry — DNS at IONOS is the
   one manual click we accept); `triggerDeploy`, `getDeployStatus`. Used by the
   website pipeline (Phase 9) and previews.
6. **Repo factory** `services/repoFactory.ts`: create client repo in
   GITHUB_ORG from `templates/ooh-starter-site` or `templates/ooh-automation-worker`
   — both template folders are built IN THIS PHASE under `templates/` (Vite+
   React+Tailwind static starter with tokens.css, sections, JSON-LD/llms.txt/
   robots/sitemap stubs, analytics snippet, contact-form wired to platform;
   Node worker starter with pg-boss, prompts/ folder, eval harness, Dockerfile)
   — plus `scripts/push-templates.ts` to publish them as GitHub template repos.
7. **PDF service** in builder: puppeteer render of HTML templates →
   FileStore reports/: certificate.html, monthly-report.html, aiseo-report.html,
   quote-sow.html. Job `pdf.render` {template, data, outPath}.

**GATE 6**
- [ ] BUILDER_DRY_RUN integration test against a local fixture repo (git
      init'd in tmp): runner produces a diff implementing a trivial fixture
      prompt, verification runs, summary parsed. (Use a stub agent mode if no
      ANTHROPIC_API_KEY in CI: replay a recorded agent transcript.)
- [ ] PR open/merge calls correctly formed (nock/recorded GitHub API tests).
- [ ] Render deployer unit tests against recorded API responses.
- [ ] Both template repos build green (`npm run build` inside each).
- [ ] PDF job renders all 4 templates to valid PDFs (>10KB, opens).
- [ ] Commit: `feat(phase-6): builder worker (agent sdk, previews, deployer, pdf)`

---

# PHASE 7 · FRONTEND PORT + NEW SURFACES

**Objective:** apps/web talks only to our API; every existing page works; the
new admin command-centre and client surfaces exist; the marketing site eats
its own AISEO dogfood.

**Build:**

1. **Data layer swap:** implement `src/lib/api.js` (fetch wrapper: base URL,
   credentials include, CSRF header, 401→refresh→retry once, typed helpers)
   and rewrite `src/lib/{AuthProvider,realtime,notifications,documents,
   uploads,mentions}.js` to use it with the SAME exported signatures where
   feasible. Then sweep EVERY page under `src/pages/**` replacing supabase-js
   usage. Remove `@supabase/supabase-js` from package.json. Delete
   `src/lib/supabase.js`.
2. **Auth pages**: Login (password + magic link tabs), PasswordReset,
   AuthCallback (magic/oauth consume) — port flows to the new endpoints.
3. **Existing app pages** verified working against the API: Dashboard (per
   role), Projects, ProjectDetail (incl. plan progress + timeline of
   claude_runs/activity), RequestDetail (comments, attachments, status,
   scope/plan/review markdown panels), Board, PlanLibrary + PlanTemplate
   (now also shows STYLE_ADAPTERS list per template with a style picker that
   writes projects.metadata.style when spawning), Documents, Notifications,
   Settings, Billing (payments list + subscriptions + Stripe portal link),
   admin Applications/Users/Audit.
4. **NEW admin surfaces** (role admin; reuse v3.css patterns):
   - `/app/admin` **Command centre**: today's queue — outreach drafts pending,
     PRs awaiting review (risk-badged, one-click Approve&Merge / Request
     changes), applications pending, capstones to confirm, quotes to send,
     alerts unacknowledged, costs today (LLM £, email count), revenue this
     month, funnel deltas. Every card deep-links.
   - `/app/admin/leads`: ICP manager (prompt/rules/threshold editors),
     sources toggle, leads table w/ scores+signals, draft approval queue
     (approve/edit/reject single + bulk), campaign settings (voice_prompt,
     send rate, **approval_mode toggle with confirm modal**), suppression
     list manager, deliverability panel (domain checks, bounce/complaint rates).
   - `/app/admin/builds`: claude_runs explorer (filter by project/stage/status),
     run detail (prompt, result, tokens, £), auto-merge kill switch, eval
     results, builder queue state.
   - `/app/admin/costs`: daily/weekly LLM £ by purpose + model (from
     v_llm_costs_daily), email volume, per-build cost averages, cap status.
   - `/app/admin/education`: cohorts + sessions CRUD, enrollments, capstone
     review queue (LLM draft grade shown, senior confirms → triggers cert),
     cert issue/revoke.
   - `/app/admin/sites`: client_sites list (uptime sparkline, domain status,
     care sub status), DNS records modal, manual redeploy button.
   - `/app/admin/aiseo`: subscriptions, latest rankings table + deltas,
      article/pitch approval queue, audit re-run button.
   - `/app/admin/content`: content_posts queue (blog/changelog drafts →
     approve/publish), testimonials approval, case-study approval.
   - `/app/admin/ops`: health board (integrations, jobs, queue depths,
     uptime incidents, backups log) + alerts inbox with acknowledge.
5. **NEW client surfaces**: `/app/quotes/:id` (quote + SOW view, line items,
   **Accept & pay deposit** button → checkout; acceptance recorded with name +
   IP + timestamp), referrals page (code, credits), project handoff pack view
   (runbook, credentials note, care plan status).
6. **NEW public pages**: `/status` (uptime + incidents from /api/v1/status),
   `/live` (anonymised engine stats), blog index/detail at `/blog` reading
   published content_posts (changelog page already exists — wire to API).
7. **Marketing dogfood**: add JSON-LD (Organization + Service + FAQ from
   data files) injected per page, `public/llms.txt`, robots.txt explicitly
   allowing GPTBot/ClaudeBot/PerplexityBot/Google-Extended, regenerate
   sitemap.xml with all routes, OG images (static template), `<meta>` audit.
   Run our own audit endpoint against the built site in CI — must score A.
8. **Forms**: Apply page → `POST /api/v1/apply` with captcha + budget/timeline
   fields feeding the quote stage; waitlist forms on saas pages; AISEO audit
   page wired to the new endpoint with the funnel CTA (book call / buy
   Foundation) on results.

**GATE 7**
- [ ] `grep -r "supabase" apps/web/src` → 0 hits.
- [ ] Playwright suites: (a) client journey — login, view project, raise
      request, comment, see scope appear (stub LLM), upload attachment;
      (b) admin journey — review application→approve, leads queue approve,
      builds queue approve&merge (dry-run), costs page renders; (c) public —
      apply form submits, aiseo audit returns scored panel, verify/:code
      renders, status page renders.
- [ ] CRA build green; bundle delta noted; no console errors on key pages.
- [ ] Built site passes own AISEO audit at grade A locally.
- [ ] Commit: `feat(phase-7): frontend on platform api + admin command centre`

---

# PHASE 8 · THE FUNNEL — LEAD → CALL → QUOTE → BUILD → CARE → EXPAND

**Objective:** one continuous, instrumented funnel. Every stage automated,
every human gate one click, every event measured (analytics_events with
`funnel.*` names → /app/admin command centre + v_funnel_weekly).

**Wire (in order):**

1. **Acquisition**: lead magnets fire funnel events (aiseo audit completed,
   logovault signup, course page visits). Each magnet's follow-up is automated:
   audit < grade B → nurture email sequence (3 emails over 10 days, value-first,
   ends in book-a-call CTA) via `email.sequence` job + suppression-aware.
2. **Outbound**: our own ICPs run through the lead engine continuously
   (Phase 3/4 jobs). `inbox.parse` (sonnet, strict JSON intent:
   positive|meeting|question|objection|unsubscribe|bounce|other):
   - positive/meeting → Cal.com booking link reply (template) + admin Slack
     ping; if calcom webhook then confirms → meeting_bookings + lead status
     `meeting_booked`.
   - unsubscribe → suppression_list + confirmation email; objection/question
     → admin alert with thread context (human replies from their inbox).
3. **Pre-call intelligence** (NEW job `funnel.precall_brief`): when a
   discovery meeting books — research brief from: application/lead row,
   their website fetch + audit score, Companies House lookup, recent news
   search. Output md → admin email + dashboard card 1 hour before the call.
4. **Post-call → quote**: admin clicks "Generate quote" on the application
   (or it auto-drafts when application.status=approved): orchestrator quote
   stage builds line items from the Appendix A price book + scope; admin
   adjusts/sends; client receives email + portal link; acceptance → Stripe
   deposit checkout (deposit_pct) → webhook marks paid → **project auto-created**
   (type + style from quote), repo created from template (websites/automations),
   plan spawned from the matching template, kickoff email with portal invite.
5. **Delivery loop**: feature_requests flow through orchestrator+builder
   (Phases 5–6). Client sees everything in portal; weekly digest + monthly
   report PDF automatic.
6. **Handoff → care/retainer**: on project status `live`: handoff pack
   generated (runbook from deploy stage + links), care/retainer upsell email
   with checkout link (websites: care plan auto-attached at quote), uptime
   check registered, 30-day fix window flag set.
7. **Expand loop**: 14 days post-live: testimonial request email (one-click
   star + quote form → testimonials, admin approves → showcase);
   30 days: case-study draft auto-written from project data (content_posts
   draft → admin approves → published + used by AISEO);
   referral nudge with code (credits via referral_credits applied as Stripe
   coupons); quarterly: account-review email proposing next automations
   (sonnet reads project activity + suggests 3 candidates).
8. **Dunning + saves**: invoice.payment_failed → 3-step dunning sequence +
   admin alert; subscription cancel → exit survey + win-back email at 30 days.
9. **Funnel reporting**: weekly `reports.funnel_weekly` email to admin:
   sources → audits/applies → meetings → quotes → accepts → revenue, with
   deltas; same data on command centre.

**GATE 8**
- [ ] Integration test of the golden path with stubs: apply → approve →
      quote sent → accept → deposit webhook → project + repo + plan exist →
      request → scope... (assert each funnel event row).
- [ ] inbox.parse classifies 6 fixture replies correctly; unsubscribe
      suppresses globally (drafter + sender both skip).
- [ ] Pre-call brief job produces md from fixture data.
- [ ] Dunning sequence fires on fixture failed-invoice event (dry-run emails captured).
- [ ] Commit: `feat(phase-8): end-to-end funnel automation`

---

# PHASE 9 · SERVICE-LINE DEEP BUILDS

**Objective:** each revenue line fully operational on the platform.

### 9.1 Websites & landing pages (the showcase automation)
- Quote accepted → repoFactory creates site repo (style adapter from quote) →
  builder runs the website handoff → preview URL to client portal ("approve /
  request changes" — changes loop back as feature_requests) → on approval:
  Render static site created, custom domain added, DNS records surfaced,
  uptime check + care subscription + handoff email. Target: zero keyboard
  touches from quote-accept to DNS-records-email.

### 9.2 AI automations & custom software
- Same pipeline; builder works against client repo (template or theirs);
  shadow-mode eval report (per handoff) attached to the PR; go-live flag is a
  config row the admin flips from the project page.

### 9.3 Web apps / SaaS / platform builds
- Multi-slice: plan stage splits into milestone feature_requests
  (auto-created, ordered); each slice = one builder run; render.yaml preview
  per PR; weekly demo digest to client compiled from merged slices.

### 9.4 Maintenance retainer
- Retainer subscription gates a project flag `retainer_tier`
  (lightweight|standard|heavy → SLA hours + monthly request quota soft-cap);
  requests auto-classified via maintenance style adapters; SLA timers
  (scoped <4h, low-risk shipped <48h) with breach alerts; monthly impact
  report PDF (shipped list, uptime, hours saved estimate).

### 9.5 Coaching (1:1)
- Stripe checkout (block of hours) → coaching_bookings → Cal.com link
  (CALCOM_EVENT_COACHING) → booking webhook attaches; 24h-before prep email
  (AI: asks for repo/goal); post-session follow-up template w/ recording link
  field; hours ledger on client billing page.

### 9.6 Courses & cohorts
- Enrollment (webhook) → cohort placement (next intake with space, from
  cohorts table) → welcome sequence; **Slack invite automation**
  (SLACK_BOT_TOKEN: invite to cohort channel; absent → manual task card
  in admin education queue); session reminder emails (24h/1h) from
  cohort_sessions; materials drip per week (lessons content from
  programmes.js weeks; gate by week number); capstone submission form →
  `education.capstone_review` job (sonnet rubric review + draft grade) →
  senior confirm click → cert-issue (PDF + verify URL + LinkedIn-share email);
  cohort health dashboard (attendance flags, at-risk learners by inactivity);
  post-course NPS + testimonial ask; 12-week grads → bench interview task card.

### 9.7 LogoVault
- **Importer job** `logovault.import_simpleicons`: seed ~3,000 SimpleIcons
  (CC0) brands w/ assets (batch, resumable). **Brandfetch fallback** env-gated
  with caching. **Vision tagging** `logovault.tag` (claude vision on uploads:
  tags + safety + confidence; ≥0.9 auto-approve else admin queue). API-key
  issuance + per-tier quotas enforced (free 50/day; indie 5k/mo; studio 50k;
  agency 500k) via api_usage rollups; 80%-quota email; overage → upgrade CTA.
  **Usage-billing job** monthly: report overages → Stripe usage records
  (metered price) or invoice line. **MCP server**: `GET/POST /api/v1/mcp/logovault`
  — streamable-HTTP MCP exposing `search_logos(query)` (read-only, key-scoped) +
  docs page snippet for Cursor/Claude configs. **DMCA queue**: public takedown
  form → admin review (NEVER automated) → takedown flag hides brand + audit row.

### 9.8 Lead engine as a service (multi-client)
- Everything already multi-tenant by client_id: client-facing portal section
  (their ICPs, drafts to approve if they hold the gate, pipeline stats,
  meetings booked); per-client sending domain support (per-campaign from
  address + DNS check job); client weekly performance email; setup fee +
  monthly via subscriptions; pause switch per campaign.

### 9.9 AISEO programme
- **Ranker job** `aiseo.rank_monthly`: per subscription × question × engine —
  engines via APIs where keys exist (Anthropic, OpenAI, Perplexity; others
  marked `unsupported` until keys/methods land — NO scraping), parse brand
  presence/position/cited URLs (sonnet extraction, strict JSON), write
  aiseo_rankings, compute deltas, alert on >20% presence drop. **Monthly
  report**: PDF render + email + Slack. **Foundation deploys** via orchestrator
  (aiseo handoff styles). **Authority loop** monthly: 3 article drafts + 5
  citation pitch drafts → admin approval queue → approved articles commit to
  client content pipeline (or change pack). **Adversarial scan** (haiku):
  monthly fetch of client pages + SERP-cited pages for injection-pattern
  heuristics → defence report section.

### 9.10 Ads sub-pipeline
- ads-generate (port) on campaigns; `ads.push` adapters for Meta + Google
  (env-gated, **dry_run default true**: writes would-push payloads for admin
  inspection); `ads.perf_daily` pulls spend/impressions/clicks/conversions →
  ad_performance; weekly creative-winner rotation job reallocates per simple
  bandit (epsilon-greedy) within campaign budget caps.

### 9.11 SaaS roadmap stubs
- saas_apps rows for Prompt Locker / Inbox Fox / Fingerprint Fund stay
  `status: planned` with waitlist capture only. NO build (deliberate focus).

**GATE 9**
- [ ] Per-line integration tests (stubs where keys missing): website golden
      path (9.1) to DNS-records step; enrollment→cohort→capstone→cert chain;
      logovault import (50-brand fixture) + quota enforcement + MCP search
      round-trip; aiseo ranker on 2 fixture questions × 2 engines; ads dry-run
      payloads validate against adapter schemas.
- [ ] Cert PDF + monthly report PDF + aiseo report PDF render with real data
      shapes from seeds.
- [ ] Commit: `feat(phase-9): all service lines operational`

---

# PHASE 10 · SECURITY, COMPLIANCE, OBSERVABILITY HARDENING

**Objective:** the platform is safe to point real clients and real money at.

**Build:**

1. **Security sweep**: dependency audit (`npm audit` triage doc); security
   headers verified (CSP for apps/web allowing only self + api + analytics;
   HSTS; frame-ancestors none except where embeds need it); cookie flags
   (`Secure`, `HttpOnly`, `SameSite=Lax`, `__Host-` prefix); rate limits
   re-checked on auth + public forms; upload content-type sniffing + size
   caps + image re-encode for avatars; path traversal tests on file routes;
   SSRF guard on URL-fetching features (aiseo audit, lead enrich: block
   private IP ranges, http→https only, 5s timeout, 3 redirects max);
   webhook signature verification tests for stripe/resend/calcom (reject
   unsigned/expired); SQL injection sweep (everything parameterised — grep
   for template-literal SQL, fix any); secrets scan (gitleaks config + CI step).
2. **Privacy/compliance (UK)**: cookie banner only if a third-party script
   exists (first-party analytics = banner-free but update privacy policy page
   copy: list analytics, what's stored, retention 13 months); PECR statement
   baked into outreach module docs; suppression honoured at every send point
   (test); data retention jobs (analytics 13mo, inbound emails 12mo, logs 30d);
   `/subprocessors` page updated to: Render, Stripe, Resend, Anthropic, OpenAI,
   Cal.com, GitHub, Google (Places/OAuth), Companies House, Meta+Google ads
   (when enabled), Slack (when enabled); DPA-ready data-export already in
   Phase 3; terms acceptance checkbox on apply/checkout flows with timestamped
   record (quotes.acceptance + users.terms_accepted_at).
3. **Observability**: optional Sentry (env-gated) in api+web+workers;
   `window.__OOH_REPORT_ERROR__` placeholder replaced with real reporter
   (Sentry or first-party `POST /api/v1/client-errors` → admin_alerts dedupe);
   pino redaction list (authorization, cookies, tokens, emails in logs where
   feasible); request latency histogram log line; jobs dashboard already in
   Phase 4; **synthetic journey check** `ops.synthetic_hourly`: scripted
   login + project read against prod every hour → alert on fail.
4. **Backups & restore**: nightly dump (Phase 4) + **documented restore
   drill** `docs/runbooks/restore.md` + `scripts/restore-check.ts` (restores
   latest dump into scratch schema weekly, sanity counts, logs to backups_log).
5. **Runbooks** `docs/runbooks/`: deploy, rollback (Render rollback + migration
   down-policy: forward-only with revert migrations), incident response,
   key rotation (per vendor), builder stuck, email deliverability dip,
   "kill switches" (auto-merge off, outreach pause, builder pause).

**GATE 10**
- [ ] Security test suite green (headers, cookies, SSRF, traversal, webhook
      signatures, rate limits, injection sweep).
- [ ] gitleaks CI step passes on full history of new files.
- [ ] Restore drill executes green locally.
- [ ] Privacy/subprocessors/terms pages updated (content matches reality).
- [ ] Commit: `feat(phase-10): security + compliance + observability hardening`

---

# PHASE 11 · RENDER DEPLOYMENT — BLUEPRINT, DOMAINS, GO-LIVE

**Objective:** one `render.yaml` deploys everything; production is live on
out-of-house.dev with green smoke tests.

**Build:**

1. **`render.yaml`** (Blueprint, IaC for the whole platform):
   ```yaml
   previews:
     generation: automatic
   databases:
     - name: ooh-db
       plan: basic-1gb            # adjust on sign-up; PITR on paid plans
       postgresMajorVersion: "16"
   services:
     - type: web                  # static frontend
       name: ooh-web
       runtime: static
       rootDir: apps/web
       buildCommand: npm install && npm run build
       staticPublishPath: build
       domains: [out-of-house.dev, www.out-of-house.dev]
       routes:                    # SPA fallback
         - type: rewrite
           source: /*
           destination: /index.html
       envVars:
         - key: REACT_APP_API_URL
           value: https://api.out-of-house.dev
     - type: web                  # API
       name: ooh-api
       runtime: node
       rootDir: .
       buildCommand: npm install && npm run build -w packages/shared -w apps/api
       startCommand: npm run start -w apps/api
       preDeployCommand: npm run migrate
       healthCheckPath: /api/v1/health
       domains: [api.out-of-house.dev]
       disk: { name: ooh-data, mountPath: /var/data, sizeGB: 10 }
       envVars: [...]             # full matrix §5, secrets sync: false
     - type: worker               # jobs
       name: ooh-jobs
       runtime: node
       rootDir: .
       buildCommand: npm install && npm run build -w packages/shared -w apps/jobs
       startCommand: npm run start -w apps/jobs
       envVars: [...]
     - type: worker               # builder
       name: ooh-builder
       runtime: docker
       rootDir: apps/builder
       dockerfilePath: apps/builder/Dockerfile
       envVars: [...]
   ```
   Validate field names against the current Blueprint spec
   (render.com/docs/blueprint-spec) and adjust — the SHAPE above is the
   contract; exact keys follow the live spec. All `DATABASE_URL`s via
   `fromDatabase`. Secrets marked `sync: false` (set in dashboard once).
2. **Deploy order runbook** `docs/runbooks/go-live.md` (write it, then a
   human follows it): create Render account/workspace → New Blueprint from
   the GitHub repo → set secret env vars (checklist from §5) → first deploy →
   run `npm run seed` once via Render shell (or a one-off job) → verify
   /admin/health → `npm run stripe:sync` → configure Stripe webhook endpoint
   (api.out-of-house.dev/api/v1/webhooks/stripe) + copy signing secret to env
   → Resend: verify send.out-of-house.dev (SPF/DKIM/DMARC records to IONOS) +
   inbound route to /webhooks/resend-inbound + webhook secret → Cal.com event
   types + webhook → IONOS DNS cutover: apex + www + api per Render
   instructions (keep GitHub Pages live until DNS verified) → flip
   EMAIL_DRY_RUN=false → smoke suite.
3. **`scripts/smoke.ts`** against any base URL: health, marketing pages 200,
   sitemap/llms.txt/robots present, apply form (test flag), login as seeded
   admin, create+read a request, aiseo audit on example.com, logo search,
   checkout session created (test mode), SSE connects, status page. Exit
   non-zero on any failure.
4. **`scripts/stripe-sync.ts`**: idempotently create/update all products +
   prices from Appendix A (lookup_keys = SKU codes; metadata.sku) — running
   twice = no duplicates; writes a local map db table `stripe_price_map`.
5. **Decommission plan** (docs only until human confirms): gh-pages workflow
   already deleted; Supabase project export+freeze steps; IONOS keeps DNS only.

**GATE 11**
- [ ] `render.yaml` passes blueprint validation (Render's schema or dry parse).
- [ ] Full local stack via `scripts/dev.sh` + `npm run smoke` against
      localhost: green end-to-end.
- [ ] stripe-sync dry-run output lists exactly the Appendix A catalogue.
- [ ] go-live runbook complete with every account step + env var + DNS record.
- [ ] Commit: `feat(phase-11): render blueprint + go-live tooling`

---

# PHASE 12 · FULL-SYSTEM VERIFICATION + HANDOVER

**Objective:** prove the whole machine, clean up, hand over.

**Build & verify:**

1. **The ten golden journeys** — Playwright/integration, all green, all with
   stubs clearly marked where external keys are absent:
   1. Visitor → AISEO audit → nurture email queued → books call (calcom stub)
      → pre-call brief generated.
   2. Application → approve → quote → accept+deposit (test card) → project +
      repo + plan created → kickoff email.
   3. Request → scope → plan → build prompt (style adapter present) → builder
      dry-run PR → review → low-risk auto-merge → deploy runbook → shipped +
      client notified.
   4. High-risk request → blocked from auto-merge → appears in admin review
      queue → one-click approve → merged.
   5. Lead discovered (fixture source) → enriched → scored ≥6 → draft
      references signal → admin approves → sent (dry-run) → positive reply
      fixture → booking link sent → meeting logged.
   6. Course purchase (test) → enrolment → cohort → capstone submit → LLM
      grade → senior confirm → certificate PDF + /verify/:code passes.
   7. LogoVault: free key → searches metered → quota exceeded → 402 +
      upgrade CTA → (test) upgrade → higher quota active; MCP search works.
   8. AISEO subscription (test) → onboarding questions drafted → baseline
      rank pull (fixture engines) → monthly report PDF emailed (dry-run).
   9. Website project: quote accept → repo → builder dry-run → preview →
      client approves → Render deploy (recorded API) → DNS records surfaced
      → uptime check live → care sub started (test).
   10. Ops: kill a fixture job 3× → admin alert; failed Stripe invoice →
       dunning; backup → restore drill; synthetic journey passes.
2. **Coverage + quality**: vitest coverage report (aim ≥75% on apps/api
   services/repos; note gaps); `npm run evals` green; Lighthouse on built
   marketing home ≥90 mobile perf; axe accessibility pass on home, /aiseo,
   /app login (no critical violations).
3. **Cleanup**: delete `supabase/` directory + supabase deps; remove dead
   code from the data-layer swap; `docs/api.md` regenerated; README rewritten
   (dev setup in <10 commands); PLATFORM_SETUP.md replaced by
   `docs/runbooks/go-live.md` pointer.
4. **Handover artefacts**: `docs/HANDOVER.md` — what was built per phase,
   every endpoint, every job + schedule, every env var, the human TODO list
   (Appendix F restated with checkboxes), known gaps/ASSUMED decisions, and
   the first-week operating guide (what to check daily = command centre).
5. Final commit + tag `v4.0.0`.

**GATE 12 (final)**
- [ ] All ten journeys green. Full test suite green. Build green everywhere.
- [ ] `npm run smoke` green locally.
- [ ] Zero grep hits for: supabase, SUPABASE_, gh-pages, hardcoded sk_live.
- [ ] HANDOVER.md complete.
- [ ] Commit: `feat(phase-12): full-system verification + handover` + tag.

---

# APPENDIX A · STRIPE CATALOGUE (price book — source of truth for stripe-sync + quotes)

SKU format `OOH-<LINE>-<ITEM>`. All GBP. `one_off` = payment mode; `monthly` =
subscription. Slugs MUST match `src/data/*.js`.

| SKU | Name | Amount | Mode | Maps to |
|---|---|---|---|---|
| OOH-COURSE-ai-fast-start-3w | AI Fast-Start (3w dev) | £395 | one_off | programmes.js |
| OOH-COURSE-ai-builder-6w | AI Builder (6w dev) | £795 | one_off | programmes.js |
| OOH-COURSE-ai-engineer-12w | AI / Automation Engineer (12w dev) | £1,495 | one_off | programmes.js |
| OOH-COURSE-business-ai-fast-3w | Business AI Fast-Start (3w) | £1,500 | one_off | programmes.js |
| OOH-COURSE-business-ai-department-6w | Build an AI Department (6w) | £3,500 | one_off | programmes.js |
| OOH-COURSE-business-ai-transformation-12w | AI Business Transformation (12w) | £6,500 | one_off | programmes.js |
| OOH-COACH-HOUR | 1:1 coaching hour | £100 | one_off (qty) | coaching_bookings |
| OOH-TEAM-TRAINING | Internal team training (from) | £2,500 | one_off | quotes |
| OOH-LV-INDIE | LogoVault Indie | £9 | monthly | saasApps |
| OOH-LV-STUDIO | LogoVault Studio | £39 | monthly | saasApps |
| OOH-LV-AGENCY | LogoVault Agency | £149 | monthly | saasApps |
| OOH-CARE-SITE | Website hosting & care | £100 | monthly | client_sites |
| OOH-RETAINER-LIGHT | Maintenance retainer — lightweight | £1,500 | monthly | subscriptions |
| OOH-RETAINER-STD | Maintenance retainer — standard | £2,500 | monthly | subscriptions |
| OOH-RETAINER-HEAVY | Maintenance retainer — heavy | £4,000 | monthly | subscriptions |
| OOH-LEADS-STARTER-SETUP / -MO | Lead engine starter | £500 / £250 | one_off / monthly | leadgen.js |
| OOH-LEADS-PIPELINE-SETUP / -MO | Lead engine pipeline | £1,500 / £750 | one_off / monthly | leadgen.js |
| OOH-LEADS-ENGINE-SETUP / -MO | Lead engine room (from) | £4,000 / £2,000 | one_off / monthly | leadgen.js |
| OOH-AISEO-FOUNDATION-SETUP / -MO | AISEO Foundation | £1,500 / £500 | one_off / monthly | aiseo.js |
| OOH-AISEO-AUTHORITY-SETUP / -MO | AISEO Authority | £3,500 / £1,500 | one_off / monthly | aiseo.js |
| (quotes) | Bespoke build line items | per quote | one_off via checkout | quotes table |

Custom builds (£750–£50k) are quote-driven: checkout created from the quote's
line items + deposit_pct, balance invoiced at handoff (second checkout link,
auto-sent on project status `live`).

# APPENDIX B · JOB SCHEDULE TABLE (single source: apps/jobs/src/schedules.ts)

| Job | Schedule (Europe/London) | Notes |
|---|---|---|
| leads.discover | */30 * * * * | per enabled source × active ICP |
| leads.enrich | */15 * * * * | batch 50 |
| leads.score | */15 * * * * | batch 100 |
| outreach.draft | 0 * * * * | suppression-aware |
| outreach.send | */30 8-18 * * 1-5 | business hours only, rate-limited |
| inbox.parse | event-driven (+ */10 sweep) | resend inbound |
| funnel.precall_brief | event-driven (booking) | 1h before, T-safe |
| email.queue_drain | */5 * * * * | respects EMAIL_DRY_RUN |
| email.sequences | 0 9 * * * | nurture/dunning steps due |
| reports.digest_weekly | 0 7 * * 1 | per active project |
| reports.monthly_impact | 0 7 1 * * | retainer/maintenance clients, PDF |
| reports.funnel_weekly | 0 8 * * 1 | admin |
| aiseo.rank_monthly | 0 6 1 * * | per subscription |
| aiseo.authority_monthly | 0 6 2 * * | drafts → approval queue |
| aiseo.adversarial_monthly | 0 6 3 * * | defence scan |
| ads.perf_daily | 0 6 * * * | env-gated |
| ads.rotate_weekly | 0 7 * * 1 | bandit reallocation |
| logovault.usage_rollup | 0 2 * * * | quotas + overage flags |
| logovault.usage_billing | 0 3 1 * * | metered billing |
| education.session_reminders | 0 * * * * | 24h + 1h lookaheads |
| education.cohort_health | 0 8 * * 3 | at-risk learners |
| ops.uptime_check | */5 * * * * | client sites + own surfaces |
| ops.synthetic_hourly | 0 * * * * | scripted journey vs prod |
| ops.backup_nightly | 0 1 * * * | pg_dump + prune |
| ops.restore_drill | 0 4 * * 0 | weekly restore check |
| ops.stripe_reconcile_nightly | 30 1 * * * | charges vs payments |
| ops.cost_rollup_daily | 15 1 * * * | LLM caps |
| ops.retention_sweep | 0 2 * * 0 | GDPR retention windows |
| funnel.expand_loop | 0 9 * * * | testimonial/case-study/referral/QBR due-dates |

# APPENDIX C · AUTOMATION LEVELS PER LINE (target state after this build)

| Line | Automated | One-click human gates | Forever-human |
|---|---|---|---|
| AI automations | scope/quote/plan/build/review-draft/deploy/evals/reports | PR approve (std/high), go-live flag | discovery call |
| Websites | quote→repo→build→preview→deploy→domain→uptime→care billing | PR approve, client preview approval | brief call (optional) |
| Web apps / platforms | milestone slicing, per-slice builds, previews, demos digest | PR approve per slice | architecture sign-off |
| Custom software | as automations + parallel-run tooling | PR approve, cutover confirm | on-site audit |
| Maintenance | triage/classify/build/low-risk auto-merge/SLA/reporting | std/high PR approve | — |
| Coaching 1:1 | booking, payment, prep, follow-up, ledger | — | the session |
| Courses | enrol→cohort→Slack→reminders→drip→LLM grading→certs→NPS | capstone grade confirm | live sessions, bench interview |
| LogoVault | import, tagging, keys, quotas, metering, billing, MCP | brand approvals <0.9 conf | DMCA review |
| Lead engine | discover→enrich→score→draft→send→parse→book→ads | draft approval (until auto-mode/ICP) | none (by design) |
| AISEO | audit, foundation PRs, ranker, reports, article drafts, defence | article/pitch approval, client-repo PR merge | citation relationships |
| Ops/finance | reconciliation, dunning, costs, backups, uptime, alerts | alert acknowledge | — |

# APPENDIX D · TRANSACTIONAL EMAIL INVENTORY (packages/shared/templates/email)

auth: magic-link, password-reset, invite, welcome-client.
funnel: application-received, application-approved+portal-invite, quote-sent,
quote-accepted-receipt, deposit-receipt, kickoff, nurture-1/2/3,
precall-brief(admin), meeting-confirm.
delivery: scope-ready, preview-ready, shipped, weekly-digest, monthly-report,
handoff-pack, balance-invoice.
care/retainer: care-started, uptime-incident, incident-resolved,
sla-breach(admin).
education: enrolment-welcome, cohort-placement, session-reminder-24h/1h,
materials-week-N, capstone-received, capstone-result, certificate-issued,
nps-ask.
commerce: payment-receipt, payment-failed-dunning-1/2/3, sub-cancelled,
win-back-30d.
growth: outreach (campaign-templated, voice-driven), unsubscribe-confirm,
testimonial-ask, referral-nudge, qbr-proposal, case-study-live.
saas: api-key-created, quota-80pct, quota-exceeded, plan-upgraded,
dmca-received(admin), dmca-actioned.
aiseo: audit-results(+nurture), onboarding-questions, monthly-report,
presence-drop-alert.
ops(admin): admin-alert, job-failed, cost-cap, deliverability-dip,
backup-failed, synthetic-failed.
Every template: List-Unsubscribe where marketing-adjacent, plain-text part,
brand header/footer, EMAIL_DRY_RUN capture.

# APPENDIX E · ADMIN PLAN-TEMPLATE PROMPTS (already shipped in repo — integrate, don't rewrite)

`src/data/planTemplates.js` v4 is the canonical prompt pack: 8 types ×
phases + CLAUDE_HANDOFFS (context contract, stack, order of operations,
AUTOMATION_CONTRACT, style adapters, DoD, non-goals) + STYLE_ADAPTERS
(36 styles) + `buildHandoff(type, style, context)`.

Your integration duties:
1. Seed all 8 into plan_templates (Phase 1) — handoffs stored WITH adapters inlined.
2. Orchestrator build_prompt stage composes via buildHandoff with
   projects.metadata.style + live context (repo_url, preview_url, scope, plan,
   quote line items) (Phase 5).
3. Plan library UI shows phases, full handoff (copy button), style picker on
   spawn writing metadata.style (Phase 7).
4. Maintenance auto-classifier maps request text → maintenance style
   (haiku, strict JSON, confidence <0.7 → default feature-increment) (Phase 5).
5. Where a handoff references platform facilities (LogoVault API, forms
   endpoint, analytics, audit endpoint, Render deploy job) — those facilities
   are exactly what you build in Phases 3–9. Keep names aligned.

# APPENDIX F · HUMAN TODO — THE ONLY MANUAL LIST (accounts + keys)

Everything below is account registration / key generation / DNS clicks.
No code. Each maps to §5 env vars; /app/admin/ops shows live status.

1. **Render** — account + workspace; connect GitHub repo; New Blueprint;
   set secret env vars; note RENDER_API_KEY + RENDER_OWNER_ID. (Paid: api web
   service, 2 workers, Postgres, disk.)
2. **GitHub** — org `out-of-house-dev` (or keep personal); fine-grained PAT
   (repo create/contents/PR) → GITHUB_TOKEN; push template repos via
   `scripts/push-templates.ts`.
3. **Anthropic** — console API key → ANTHROPIC_API_KEY (billing limits set).
4. **OpenAI** — API key → OPENAI_API_KEY (fallback only).
5. **Stripe** — live account; restricted key → STRIPE_SECRET_KEY; run
   `npm run stripe:sync`; add webhook endpoint → STRIPE_WEBHOOK_SECRET;
   enable customer portal + Bacs/cards as desired.
6. **Resend** — domain send.out-of-house.dev (SPF/DKIM/DMARC → IONOS DNS);
   inbound domain in.out-of-house.dev → webhook; RESEND_API_KEY +
   RESEND_WEBHOOK_SECRET.
7. **Cal.com** — event types (discovery 30m, coaching 60m, aiseo, lead-engine);
   API key + webhook → CALCOM_*.
8. **Google Cloud** — Places API key → GOOGLE_PLACES_API_KEY; (optional)
   OAuth client for login → GOOGLE_OAUTH_*.
9. **Companies House** — free API key → COMPANIES_HOUSE_API_KEY.
10. **IONOS** — DNS only: apex/www/api records per Render; Resend records;
    (keep registrar as-is).
11. *(Optional, when ready)* Slack bot token + channels; Sentry DSNs;
    Perplexity API key (ranker engine); Meta + Google Ads tokens; S3/R2
    credentials (off-box file store + backups); Brandfetch key (LogoVault
    fallback).

---

## FINAL INSTRUCTION

Begin with Phase 0 now. Re-read §0 (including the Autonomy Charter — this is
an unattended overnight run: no questions, no usage limits, subagents at
will). At every gate, print a phase report: ✅/❌ per gate item, files touched
count, tests run/passed, ASSUMED decisions, then the commit. If context runs
long between phases, re-read this file and `docs/prompts/PROGRESS.md` — which
you will maintain after every phase (phase, status, notable decisions, next
step) so any future run (or human) can resume exactly where you stopped.

Build it properly. The brand survives on the quality gate — when in doubt,
choose the boring, verifiable implementation and flag the doubt.

