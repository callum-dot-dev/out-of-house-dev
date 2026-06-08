# out-of-house.dev

A senior-engineer agency platform with an AI-automated delivery pipeline, hosted
on **Render** (compute + Postgres). Monorepo; one `render.yaml` deploys everything.

## Dev setup (< 10 commands)
```
cd out-of-house-dev      # the project lives in this subfolder
npm install
cp .env.example .env      # fill in keys as needed (integrations degrade gracefully)
npm test                  # 41 tests — boots a throwaway Postgres (no Docker needed)
npm run evals             # prompt-output eval harness
npm run typecheck
npm run lint
npm run build:web         # CRA production build
bash scripts/dev.sh       # full local stack (Postgres + api + jobs + web)
```

## Workspaces
| Path | What |
|---|---|
| `apps/web` | CRA frontend → talks only to the API (`src/lib/api.js`) |
| `apps/api` | Fastify API: auth, RBAC, REST, SSE, webhooks, files, admin |
| `apps/jobs` | pg-boss worker: orchestrator + ~33 jobs (Appendix B schedules) |
| `apps/builder` | headless Claude Code runner + GitHub/Render clients + PDF |
| `packages/shared` | LLM router, evals, shared types |
| `db/` | migration runner + schema + idempotent seed |
| `templates/` | client-repo starters (Vite site, Node automation worker) |

## Deploy
`render.yaml` at the **git repo root** is the Blueprint. See
`docs/runbooks/go-live.md` and `docs/HANDOVER.md`.

## Architecture decisions
`docs/adr/` (Render migration, schema port). Build journal: `docs/prompts/PROGRESS.md`.
