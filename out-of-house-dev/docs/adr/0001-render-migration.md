# ADR 0001 — Render migration architecture (A1–A10)

- **Status:** accepted
- **Date:** 2026-06-08
- **Context:** Migrating out-of-house.dev off GitHub Pages + Supabase onto Render
  (compute + Postgres) with a custom Node backend, per the v4 master spec.

## Decisions

- **A1 — Auth (own).** argon2id passwords, magic-link + password + optional Google
  OAuth. Short-lived JWT access token (15 min, `jose`) in httpOnly `__Host-ooh_at`
  cookie + rotating refresh token (30 days) in `__Host-ooh_rt`, server-side
  revocable session rows. CSRF double-submit on state-changing routes. Roles:
  `client | developer | admin` on `users.role`.
- **A2 — Authorization replaces RLS.** Every query goes through repository
  functions taking a `Viewer` (user id + role) that scope SQL. A red-team test
  suite proves cross-account isolation per resource. Admin endpoints are separate
  and audited.
- **A3 — Jobs.** `pg-boss` v10 on the same Postgres; all schedules in code
  (Appendix B). No Render cron services.
- **A4 — Realtime.** SSE endpoint `GET /api/v1/realtime` per user; frontend falls
  back to 30s polling.
- **A5 — Storage.** `FileStore` driver interface — `disk` driver (Render
  persistent disk at `/var/data`, authenticated streaming) + optional `s3` driver
  (R2/S3, env-gated). Buckets → prefixes.
- **A6 — LLM router.** `packages/shared/llm.ts`. Models: `claude-opus-4-8`
  (planning/build), `claude-sonnet-4-6` (scoping/drafting/review),
  `claude-haiku-4-5-20251001` (scoring/classify), OpenAI fallback. Per-call
  tokens + GBP cost + purpose tag → `llm_calls`. Daily cap from
  `LLM_DAILY_CAP_GBP` (default 50). Implemented as a leaf module with injected
  `persist`/`withinCap` hooks so it never imports the DB layer.
- **A7 — Claude Code worker.** `@anthropic-ai/claude-agent-sdk` headless; one run
  per repo, global concurrency 2; GitHub via fine-grained PAT.
- **A8 — PDF.** `puppeteer` (bundled chromium) in `apps/builder` Docker image;
  HTML templates in `packages/shared/templates/pdf/*`.
- **A9 — Frontend stays CRA** and talks ONLY to `apps/api` via `src/lib/api.js`
  (`REACT_APP_API_URL`). supabase-js fully removed (Phase 7).
- **A10 — Client sites we host:** each is its own GitHub repo + Render static
  site created via the Render API, tracked in `client_sites`, uptime-checked,
  billed via a Stripe care plan.

## Repository layout decision (project nesting)

The git repository root is `callum-dot-dev/out-of-house-dev`, which contains a
stub `README.md` and the entire platform nested one level down in
`out-of-house-dev/` (the npm workspace root). We **keep this nesting** rather than
flattening mid-migration (flattening risks a tangled index and Windows cwd file
locks for cosmetic benefit). Consequences:

- **GitHub Actions** workflows live at the git root `.github/workflows/` with
  `defaults.run.working-directory: out-of-house-dev`.
- **Render Blueprint** (`render.yaml`, Phase 11) sits at the git root; every
  service uses `rootDir: out-of-house-dev` (the workspace root) so build/start
  commands and the builder Dockerfile see a normal monorepo.
- A future flatten (move `out-of-house-dev/*` to the git root) remains an option
  and is noted in HANDOVER for the human to take if desired.
