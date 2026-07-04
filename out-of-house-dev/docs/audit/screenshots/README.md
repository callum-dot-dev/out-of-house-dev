# Redesign before/after screenshots

Captured with `apps/web/scripts/capture-screenshots.mjs` (Playwright Chromium,
1280×900 desktop full-page + a 390px mobile homepage, `prefers-reduced-motion`
emulated so every reveal section shows its resting state).

- `2026-07-live/` — **BEFORE.** The pre-redesign v3 design, captured 2026-07-04
  by building the source at the pre-redesign commit (`c42c253`) and running the
  same capture script. The live site could not be reached from the build sandbox
  (no network egress — `docs/prompts/BLOCKERS.md` §E); the local build of the
  pre-redesign source carries the identical v3 design the live site serves, so it
  is the correct visual baseline for the redesign diff. Both sets use the same
  script (content-visibility defeated, reveal sections forced visible) so the
  before/after comparison is like-for-like.
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
