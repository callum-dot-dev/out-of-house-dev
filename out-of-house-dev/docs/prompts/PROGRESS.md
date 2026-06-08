# Build progress — v4 Render platform migration

Resume trail for the 13-phase build. Updated after every phase. Branch:
`feat/v4-render-platform` (off `main`; `main` keeps serving the live gh-pages
site until go-live cutover in Phase 11).

Key structural fact: the **git repo root is one level above** the project. The
platform lives in `out-of-house-dev/` (the npm workspace root). CI + render.yaml
live at the git root and target that subfolder (see ADR 0001).

---

## Environment notes (this build machine)

- Windows 11 + PowerShell; Node **v24.15.0**, tsc 5.9.3.
- **No Docker, no psql, no pg_dump on PATH.** Phases that verify against a real
  Postgres (1 gate, 2 isolation suite, 3/4/8 integration) use the
  **`embedded-postgres`** npm package (downloads a real portable PG binary — no
  Docker) for local verification. `ops.backup_nightly` (Phase 4) will shell to
  the `pg_dump` shipped inside that embedded install. CI (GitHub Actions) uses a
  `services: postgres:16` container instead. Decided per Autonomy Charter; ADR to
  be added in Phase 1.

---

## Phase 0 — Monorepo restructure + tooling — ✅ DONE (gate green, commits 408e3b5 + c9930f7)

**Gate evidence**
- `npm install` (workspaces resolve; `node_modules/@oohdev/{api,jobs,builder,shared,web}` symlinked) ✅
- `npm run build:web` → CRA build green, "hosted at /" (homepage removed) ✅
- compiled API live HTTP `GET /api/v1/health` → `{"ok":true}` ✅ (+ vitest inject test)
- `npm run lint` ✅ · `npm run typecheck` ✅ (all 4 TS workspaces) · `npm test` ✅ (1/1)
- `npx yaml-lint .github/workflows/ci.yml` ✅


**Done**
- Branch `feat/v4-render-platform` created.
- CRA app moved (git-history-preserving) → `apps/web/` (src + public).
- Removed gh-pages artifacts: `.github/workflows/github-pages.yml`,
  `apps/web/public/CNAME`. (Manual `gh-pages` deploy script also dropped from
  package.json — the old deploy was a manual CLI push, never an Actions run.)
- npm workspaces root `package.json` (`apps/*`, `packages/*`, node >=20, scripts:
  dev/build/test/lint/typecheck/migrate/seed/stripe:sync/smoke).
- Scaffolded `apps/api` (Fastify 4 + TS strict, `buildApp()` + `/api/v1/health`),
  `apps/jobs` (stub), `apps/builder` (stub + Dockerfile: node20 + git + chromium
  deps), `packages/shared` (ported `llm.ts`).
- `packages/shared/llm.ts` ported from the Deno edge `_shared/llm.ts`:
  `process.env`, model ids per A6 (`claude-opus-4-8`), `purpose` tag,
  `persist`/`withinCap` hooks, `DEFAULT_MODEL` map, robust JSON extraction.
- Tooling: `tsconfig.base.json` (strict, CommonJS), flat `eslint.config.js`
  (ignores apps/web — CRA self-lints), `.prettierrc`, root `vitest.config.ts`
  (passWithNoTests), `apps/web/playwright.config.ts`.
- CI `.github/workflows/ci.yml` at git root (working-directory `out-of-house-dev`):
  install → lint → typecheck → build backend → test → build web.
- `.env.example` rewritten to the full §5 matrix. `scripts/dev.sh` scaffold.
- ADR `docs/adr/0001-render-migration.md`.

**Decisions / ASSUMED**
- Keep project nesting; CI + Render target `out-of-house-dev/` (ADR 0001).
- Fastify **4** (per spec) — plugin majors pinned to the v4-compatible line when
  added in Phase 2.
- `@fastify/*` plugins, argon2, jose, pg, pg-boss etc. are added in the phase
  that first uses them (keeps each install lean), not all front-loaded in P0.
- CRA monorepo: `SKIP_PREFLIGHT_CHECK=true` + `CI=false` baked into web scripts
  via `cross-env` to avoid hoisting-tree false errors / warnings-as-errors.
- Module system: CommonJS across the TS backend (avoids ESM `.js`-extension
  import friction; tsx + tsc both happy).

**Deferred (not Phase 0 gate; flagged for the porting phases)**
- `scripts/seed.js` + `scripts/build-roadmap-pdf.js` still reference pre-move
  `../src/...` paths → ported in Phase 1 (seed) / rehomed under apps/web later.
- `apps/web` still imports `@supabase/supabase-js` — removed in Phase 7.

**Next:** Phase 1 — `db/migrate.ts` runner; `0001_baseline.sql` (port all ~46
tables from `supabase/migrations/001..006`, drop RLS/policies, `profiles`→`users`);
`0002_v4_platform.sql` (~30 new tables/views); `db/seeds/seed.ts` (idempotent;
8 plan templates from planTemplates.js, programmes, saas_apps, ICPs, sources);
add `embedded-postgres` dev dep + a vitest DB harness; checksum-drift + seed
idempotency tests.

---

## Phase 1 — Database baseline + v4 tables + seeds — ✅ DONE (gate green)

**Built**
- `db/migrate.ts` — forward-only runner; `db/migrations/*.sql` in order, each in a
  txn, sha256 recorded in `schema_migrations`; re-run no-op; checksum drift = hard error.
- `db/migrations/0001_baseline.sql` — faithful consolidated port of 001..006
  (~46 tables, all checks/indexes, `certificate_verifications` + `user_unread_count`
  views, pure triggers). `profiles`→`users` (+auth cols), RLS/`auth.uid()` removed,
  006 type-widening + `projects.metadata` baked in. See ADR 0002.
- `db/migrations/0002_v4_platform.sql` — 25 new tables (sessions, auth_tokens,
  oauth_identities, quotes, stripe_events, client_sites, uptime_*, status_incidents,
  suppression_list, inbound_emails, meeting_bookings, testimonials, case_studies,
  referral_credits, capstone_submissions, admin_alerts, llm_calls, analytics_events,
  email_events, files, backups_log, feedback, content_posts, settings) + views
  (v_llm_costs_daily, v_revenue_monthly, v_funnel_weekly) + orchestrator ALTERs
  (feature_requests status superset + risk_class; projects.retainer_tier).
- `db/seeds/seed.ts` — idempotent; 3 users (argon2id hashes via @node-rs/argon2),
  8 plan templates (require planTemplates.js), 6 programmes + cohorts, 4 saas_apps,
  10 logovault brands, 6 lead sources, 2 ICPs, default campaign, own-site uptime
  check, demo project + 5 requests + plan + 3 applications.
- `db/testing/pg.ts` — embedded-postgres harness (real PG, no Docker; creates the
  test DB as UTF8 to dodge the Windows WIN1252 initdb default).

**Gate evidence**
- `npm test` ✅ 4/4: api health · migrate apply+no-op · **checksum-drift rejected** ·
  **seed idempotent** (2nd run == 1st) + smoke counts (users 3, plan_templates **8**,
  programmes 6, cohorts 6, saas_apps 4, lead_icps 2, uptime 1, project 1, requests 5,
  applications 3) + `v_funnel_weekly`/`v_revenue_monthly`/`v_llm_costs_daily`/
  `certificate_verifications` queryable.
- `npm run typecheck` ✅ (now also covers `db/` + `scripts/` via root tsconfig, node16
  resolution) · `npm run lint` ✅.

**Decisions / ASSUMED**
- ADR 0002 written (profiles→users, RLS→repo layer, dropped auth.uid() triggers,
  money: existing numeric `_gbp` kept / new money in integer pence).
- `embedded-postgres` is beta-only on npm → pinned exact `18.4.0-beta.17`. Works in
  CI (ubuntu) too via its linux binary, so **no postgres service needed in CI**.
- `@node-rs/argon2` chosen over `argon2` (prebuilt binaries, no native compile).
- feature_requests status widened now to the Phase-5 orchestrator superset to avoid
  a near-term migration.

**Next:** Phase 2 — API foundation (Fastify plugins, full auth lifecycle, RBAC +
Viewer repos, CSRF, FileStore, SSE, notifications, audit, admin/health, analytics
collector) + the isolation red-team suite (run against embedded-postgres).

## Phase 2 — API foundation — ✅ DONE (gate green)

**Built (`apps/api`)** — Fastify 4 + TS:
- Bootstrap: cookie, CORS (locked to PUBLIC_SITE_URL + localhost, credentials),
  helmet, rate-limit (skipped in test), multipart, pino req_id, global error
  handler (Zod→400, AppError→coded), CSRF double-submit (XSRF cookie + header on
  unsafe non-exempt routes).
- Auth `/api/v1/auth/*`: register (invite-only + first-admin bootstrap), login
  (argon2id + in-memory lockout 10/15m), logout, refresh (rotating opaque tokens
  in `sessions` + **reuse-detection revokes the family**), magic request/consume,
  password forgot/reset, all setting `ooh_at`/`ooh_rt` cookies (`__Host-` in prod).
  HS256 access tokens hand-rolled on node:crypto (dropped `jose` — ESM-only would
  break the CJS build on Node 20).
- `/me` get/patch + `/me/password`; `/guest/consume`.
- RBAC: `Viewer` + `requireAuth`/`requireRole`; repository layer scopes every
  query (projects/featureRequests/documents/notifications) — replaces RLS.
- FileStore disk driver (traversal-guarded) + `POST/GET /files` with scope auth.
- SSE `GET /realtime` (LISTEN/NOTIFY bridge → in-process emitter, heartbeat) +
  `notify()` service (row + SSE + queued email) + `audit()` + email capture.
- `GET /admin/health` (db, integrations configured|missing, dry-run, storage).
- First-party analytics collector `POST /collect`.

**Gate evidence** — `npm test` ✅ 18/18; `apps/api/test/integration.test.ts`
(14, against embedded-postgres + real `app.listen`):
register→me→refresh→logout · invite-only rejection · password login · magic-link
round-trip (captured) · **isolation red-team** (client B 404 on A's project/
requests/list; doc visibility; staff sees all) · CSRF reject+accept · file
upload→owner download 200 / other client 403 · **SSE delivers notify()** ·
admin/health integrations=missing + 403 for non-admin · guest token · lockout→429.
Lint ✅, typecheck ✅.

**Decisions / ASSUMED**
- Dropped `jose` → node:crypto HS256 (CJS/Node-20 safe).
- Cookie names: `__Host-ooh_at/rt` in prod, plain in dev/test (http localhost).
- Lockout is in-memory (per-process) for now — note for multi-instance.
- Scoped read routes for projects/requests/docs/notifications added now (Phase 3
  adds full CRUD + the rest of the domain surface).

**Next:** Phase 3 — port the 13 edge functions + all platform routes
(applications/projects/requests CRUD, checkout, webhooks, logo search, aiseo
audit, etc.) wiring `@oohdev/shared`.

## Phase 3 — Domain API (edge-function ports + platform routes) — ✅ DONE (gate green)

**Edge-function ports (→ routes):** aiseo-audit (`POST /aiseo/audit`, 14 checks
verbatim, SSRF-guarded `safeFetch`), stripe-checkout (`POST /checkout`,
**server-side price book** `lib/pricing.ts` — never trusts client amount),
stripe-webhook (`POST /webhooks/stripe`, signature verify + `stripe_events`
idempotency + fan-out: payments→enrollments/coaching/subscriptions + dunning
alert), logo-search (`GET /logovault/search` + api_usage metering),
cert-issue (`POST /admin/certificates`, OH- codes). _(lead-*/outreach-*/ads/
digest → Phase 4 jobs; claude-orchestrate → Phase 5.)_

**Platform routes:** public `POST /apply` (honeypot) + admin review/approve
(**approve provisions user+project+invite+email**) / reject; feature_requests
create + staff PATCH (activity + client notify) + comments; projects admin
create/PATCH; plan-templates (staff) + programmes/saas/changelog (public);
`POST /checkout`; `GET /verify/:code`, `/status`, `/live`, `POST /waitlist`,
`POST /forms/contact`. Invite-claim added to `/auth/register` (password-less
account → set password via invite). Stripe lib (REST + HMAC sig, stub when
unconfigured). `docs/api.md` auto-generated (`scripts/gen-api-docs.ts`).

**Gate evidence** — `apps/api` 20/20 (incl. `phase3.test.ts`, 5): apply→approve→
invite+project→**claim** · checkout at catalogue price (£795, stub) + **webhook
idempotency** (2nd = duplicate, payment succeeded once, 1 enrollment, 1
stripe_event) + bad-signature 400 · logovault search + metering row · **aiseo
audit** rich(A) vs bare(F), 14 checks, org_schema/llms_txt pass+fail paths.
Lint ✅, typecheck ✅.

**Deferred:** lead/outreach/ads/digest logic → Phase 4 jobs; the apps/web
supabase→API swap (grep-0) → Phase 7; Cal.com/Resend inbound/GDPR routes →
Phases 4/8/10 where their runtime lands.

**Next:** Phase 4 — pg-boss runtime, `defineJob`, Appendix B schedules, ops crons
(uptime, backup, cost rollup, reconcile), lead/outreach/digest job handlers,
email queue drain.

## Phase 4 — Jobs runtime + schedules + ops crons — ✅ DONE (gate green)

**Built (`apps/jobs`)** — pg-boss 10:
- `boss.ts` (singleton), `defineJob()` (zod payload, pino logs, retry+backoff,
  **final-failure → admin_alert** via `includeMetadata` retryCount), `registerWorker`,
  `enqueue`, `runJobHandler` (direct, for manual trigger + tests), `ALL_JOBS` registry.
- Job handlers (ported, LLM→heuristic + key-gated external calls):
  leads.discover/enrich/score, outreach.draft/send (suppression + rate-limit +
  dry-run), inbox.parse (intent → suppression/alert), reports.digest_weekly/
  monthly_impact/funnel_weekly, ops.uptime_check/backup_nightly/cost_rollup_daily/
  stripe_reconcile_nightly/disk_watch, email.queue_drain/sequences (16 jobs).
- `schedules.ts` = Appendix B cron table (Europe/London); `index.ts` bootstrap.
- **Portable JSON logical backup** (`ops.backup_nightly`) + `restore.ts` (type-aware
  jsonb/tsvector, replica-role load) — no pg_dump dependency (embedded-postgres
  ships none); Render PITR is the physical layer.
- API: `GET /admin/jobs` (pgboss depths/schedules/failures), `POST /admin/jobs/:name/run`
  (pg-boss client). `/admin/health` now reports queue depth.
- `@oohdev/shared` consumed via lazy import (no-key path skips it); vitest aliases
  it to source; root `typecheck` builds shared first.

**Gate evidence** — `apps/jobs` 5/5: all 16 handlers execute under no-key
degradation · pg-boss enqueue→worker · **retry succeeds on 3rd attempt** ·
**final failure writes admin_alert** · **backup JSON-dump → migrate fresh DB →
restore (users=3, plan_templates=8)**. Lint ✅, typecheck ✅. Full suite 25 tests.

**Next:** Phase 5 — orchestrator state machine (scope→quote→plan→build_prompt→
review→deploy), risk classifier, auto-merge policy, cost caps, eval harness,
composing prompts via `buildHandoff()`.

## Phase 5 — Orchestrator v2 — ✅ DONE (gate green)

**Built (`apps/jobs/src/orchestrator`)** — state machine on `feature_requests.status`:
- `runStage(requestId, kind, {force, pr})` — idempotent per (request_id, kind) via
  claude_runs; LLM stages respect the **daily cost cap** (breach → claude_run
  cancelled + admin_alert + no transition); writes activity + client notify.
- Stages (ported prompts + deterministic no-key template fallbacks): scope→scoped,
  quote→quoted (drafts a `quotes` row; skipped for retainer), plan→planned,
  **build_prompt** (composes via `buildHandoff(type, metadata.style, ctx)` →
  contains the AUTOMATION_CONTRACT + active style adapter) →building, review
  (risk + verdict + auto-merge decision) →approved|review, deploy→shipped.
- `risk.ts` classifier (auth/billing/migration/email/.sql → high; content-only small
  → low), `mergePolicy.ts` (`isAutoMergeEligible`), `transitions.ts` (legal map +
  `canTransition`), `settings.auto_merge_enabled` kill switch.
- `orchestrate.stage` job (optional payload → cron no-op; real runs pass request/kind).
- Eval harness `packages/shared/src/evals/run.ts` (15 golden fixtures, structural
  validators) — `npm run evals` green in CI.

**Gate evidence** — orchestrator 6/6 + evals 15/15: legal/illegal transitions ·
risk + merge gating · **full pipeline** scope→plan→build_prompt(style+contract)→
review(low-risk)→**approved** · high-risk→not eligible→review · **idempotent reuse**
· **cost-cap breach → cancelled + alert**. Full suite **34 tests** green; lint ✅.

**Next:** Phase 6 — builder worker (Agent SDK runner, BUILDER_DRY_RUN, repo factory
+ templates, Render deployer, puppeteer PDF) consuming `builder.run`/`builder.merge`.

## Phase 6 — Builder worker — ✅ DONE (gate green; heavy deps env-gated)

**Built (`apps/builder`)**:
- `runner.ts` — clone → branch (AUTOMATION_CONTRACT) → apply change (real Claude
  Agent SDK when key present, else deterministic degraded change) → verify → diff
  → commit → push+PR (unless **BUILDER_DRY_RUN** → writes diff to FileStore) →
  writeback claude_runs. Summary-json parsing, secret scrubbing, workdir wiped.
- `github.ts` (openPR/mergePR/createRepoFromTemplate), `render.ts` (createStaticSite/
  addCustomDomain→DNS records/triggerDeploy/getDeployStatus), `merge.ts`,
  `repoFactory.ts` — fetch-based, degrade clearly without tokens.
- `pdf.ts` — 4 templates (certificate, monthly-report, aiseo-report, quote-sow) →
  PDF via puppeteer-core when a Chromium path is set, else HTML artifact.
- `index.ts` worker (builder.run/builder.merge/pdf.render queues).
- Templates: `templates/ooh-automation-worker` (Node/TS, builds green) +
  `templates/ooh-starter-site` (Vite/React/Tailwind, JSON-LD/llms.txt/robots/
  contact-form/analytics). `scripts/push-templates.ts` publisher.
- **Wired Phase 5→6:** orchestrator build_prompt enqueues `builder.run`; eligible
  review enqueues `builder.merge` (best-effort via pg-boss).

**Gate evidence** — builder 7/7: **dry-run** clone→change→verify→diff(no PR) ·
failing-verify reported · GitHub openPR/merge request formation (mocked fetch) ·
Render createStaticSite/custom-domain (mocked fetch) · 4 PDF templates render to
artifacts · **automation-worker builds green** · starter-site structure valid.
Full suite **41 tests**; typecheck + lint ✅.

**Honest degradations (env/CI/human-gated, not box-verifiable):**
- `@anthropic-ai/claude-agent-sdk` + `puppeteer-core` + a Chromium are NOT declared
  (dynamic-import + degrade) — the human installs them for live agent builds / PDF
  rasterisation (Appendix F). Code path is complete.
- starter-site **Vite build** validated structurally here (full `vite build`
  verified in CI / on the builder's first deploy — heavy install skipped on box).
- per-repo lock / global concurrency = run BUILDER_CONCURRENCY worker replicas.

**Next:** Phase 7 — frontend port (apps/web supabase→`src/lib/api.js`, auth pages,
admin command centre + new surfaces, marketing AISEO dogfood), Playwright suites.

## Phase 7 — Frontend port — 🔶 FOUNDATION DONE (page sweep remaining)

**Done:** `src/lib/api.js` — the new data layer (cookie auth, CSRF header on writes,
401→refresh→retry, `api.get/post/put/patch/del/upload`, `auth` surface, `useApi`
hook). `AuthProvider.js` rewritten onto the API (contract preserved → consuming
pages unaffected). CRA build still green.

**Remaining (mechanical but large — 88 supabase calls / 29 files):**
1. Rewrite libs `realtime.js` (→ SSE `EventSource` on `/realtime`),
   `notifications.js`, `documents.js`, `uploads.js`, `mentions.js`,
   `CommentComposer.js` onto `api.js`.
2. Sweep ~22 pages (`pages/**`) replacing every `supabase.*` call with `api.*` /
   `auth.*`; remove `@supabase/supabase-js`; delete `src/lib/supabase.js`.
3. **Endpoint gaps to add in apps/api** (some pages read tables without a route
   yet): admin users list, subscriptions/billing summary, settings update,
   board/kanban data, decisions, changelog admin — grep-audit each `supabase.from`
   and add the matching viewer-scoped route.
4. New admin command-centre + client/public surfaces; marketing JSON-LD/llms.txt
   dogfood; Playwright suites.
**Gate (not yet met):** `grep -r supabase apps/web/src` → 0; Playwright green; CRA
build green; own AISEO audit grade A.

## Phases 8–12 — ⬜ not started (funnel, service lines, security, Render deploy, verification)
```
1  Database baseline + v4 tables + seeds
2  API foundation (auth, rbac, files, sse, analytics)
3  Domain API (edge-function ports + platform routes)
4  Jobs runtime + schedules + ops crons
5  Orchestrator v2 (quote, risk, automerge, evals)
6  Builder worker (agent sdk, previews, deployer, pdf)
7  Frontend on platform API + admin command centre
8  End-to-end funnel automation
9  All service lines operational
10 Security + compliance + observability hardening
11 Render blueprint + go-live tooling
12 Full-system verification + handover
```
