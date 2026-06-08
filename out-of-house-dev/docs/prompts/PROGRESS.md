# Build progress — v4 Render platform migration

Resume trail for the 13-phase build. Updated after every phase. Branch:
`feat/v4-render-platform` (off `main`; `main` keeps serving the live gh-pages
site until go-live cutover in Phase 11).

Key structural fact: the **git repo root is one level above** the project. The
platform lives in `out-of-house-dev/` (the npm workspace root). CI + render.yaml
live at the git root and target that subfolder (see ADR 0001).

---

## Phase 0 — Monorepo restructure + tooling — ⏳ in progress (verifying gate)

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

**Next:** finish Gate 0 verification (install, web build, api health, lint,
typecheck), commit `feat(phase-0): monorepo restructure + tooling`, then Phase 1
(baseline schema + migration runner + seeds).

---

## Phases 1–12 — ⬜ not started
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
