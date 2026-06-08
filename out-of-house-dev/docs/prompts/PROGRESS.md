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

## Phase 1 — Database baseline + v4 tables + seeds — 🔜 next

Plan locked: read `supabase/migrations/001..006.sql` verbatim (faithful port),
compose the squashed baseline, then the v4 additions, then seeds. Verify with
embedded-postgres (migrate clean + re-run no-op + seed idempotency + smoke SQL).

## Phases 2–12 — ⬜ not started
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
