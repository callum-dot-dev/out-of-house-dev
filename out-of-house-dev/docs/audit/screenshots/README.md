# Redesign before/after screenshots

Captured with `apps/web/scripts/capture-screenshots.mjs` (Playwright Chromium,
1280×900 desktop full-page + a 390px mobile homepage, `prefers-reduced-motion`
emulated so every reveal section shows its resting state).

- `2026-07-live/` — **BEFORE.** The current v3 design, captured 2026-07-04 against
  a local production build (`npm run build:web`). The live site could not be
  reached from the build sandbox (no network egress — see `docs/prompts/BLOCKERS.md`
  §E); the local build carries the same v3 visual design the live site serves, so
  it is the correct visual baseline for the redesign diff.
- `2026-07-after/` — **AFTER.** The `feat/redesign-v4` result, captured the same way.

Re-capture:

```bash
npm run build:web
# before-style (defaults to docs/audit/screenshots/2026-07-live)
node apps/web/scripts/capture-screenshots.mjs
# after
OUT_DIR=docs/audit/screenshots/2026-07-after node apps/web/scripts/capture-screenshots.mjs
```

Authed `/app/*` shells are not captured here (they need the full running stack +
seeded auth; the authed app is restyled via shared primitives, not rewired).
