# ooh-automation-worker

Starter for an out-of-house.dev AI automation. Pattern: **ingest → reason → act → notify**.

- `src/index.ts` — the workflow (replace the steps).
- `src/evals.ts` — fixture-based eval harness (the accuracy gate).
- Dry-run via `DRY_RUN=true`. Verify with `npm run build && npm run evals`.
