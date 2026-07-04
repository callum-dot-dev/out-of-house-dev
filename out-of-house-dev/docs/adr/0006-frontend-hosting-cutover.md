# ADR 0006 — Frontend hosting cutover (GitHub Pages → Render static site)

- **Status:** accepted (execution gated on Callum — DNS/merge/gh-pages are manual)
- **Date:** 2026-07-04
- **Context:** Audit §2 found the live site is served by **GitHub Pages** from the
  pre-v4 flat CRA on `main`, while the v4 monorepo (this redesign) has never been
  deployed. The root `deploy.yml` runs `npm run build` at the workspace root and
  publishes `out-of-house-dev/build`; on the monorepo that root build compiles
  only the TS apps and never produces a web bundle → the workflow **fails the
  moment the monorepo reaches `main`** (the "time bomb"). ADR 0001 already chose
  Render as the platform host. A redesign is the natural cutover point (§3.5).

## Decision

**Cut the marketing site over to a Render static site (`ooh-web` in
`render.yaml`), with GitHub Pages retained as a working rollback until DNS
flips.** Concretely:

1. `render.yaml`'s `ooh-web`: `runtime: static`, `rootDir: out-of-house-dev`,
   build `npm install && npm run build:web`, publish `apps/web/build`, SPA
   rewrite `/*` → `/index.html`, custom domains `out-of-house.dev` +
   `www.out-of-house.dev`, `REACT_APP_API_URL=https://api.out-of-house.dev`.
   **B8 addition:** security headers — HSTS (`max-age=63072000; includeSubDomains;
   preload`), `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
   `Permissions-Policy`. Render provisions TLS automatically.
2. **`deploy.yml` is patched, not deleted, and made dispatch-only.** The old
   flat-CRA build command is replaced with `build:web` + `publish_dir:
   out-of-house-dev/apps/web/build`, and the `push: main` trigger is removed. So
   on merge to `main` it can't auto-run (no time bomb, no double-deploy against
   Render) but remains a **manual GitHub Pages rollback** that builds the correct
   monorepo bundle during the cutover window. It is deleted only after gh-pages
   is retired (runbook §6).
3. Deployment of the site itself is **Render auto-deploy** (Blueprint), not
   Actions — consistent with Phase 0's "deploys via Render, not Actions".

## Why not the alternatives

- **Keep gh-pages as primary, just fix `deploy.yml`:** viable as the documented
  fallback, but it leaves the platform split (site on Pages, API on Render) and
  doesn't get the security headers / same-origin story. Render is already the
  home for the API/jobs/db (ADR 0001); putting the site there is one platform,
  one blueprint. Kept only as the rollback path.
- **Delete `deploy.yml` outright now:** would remove the rollback target before
  DNS flips. Retire it *after* the cutover instead (runbook §6).
- **Enforce a CSP immediately:** deferred — a CSP must be validated against the
  live third-party embeds (cal.com, Stripe, Google OAuth, analytics/voice) or it
  breaks them. HSTS + hardening headers ship now; CSP is a tracked follow-up.

## Consequences

- The deliverable is a **gated PR + a runbook**, not a live deploy:
  `docs/runbooks/hosting-cutover.md` is the exact click-path (Render blueprint →
  custom domains → IONOS DNS → TLS verify → gh-pages retirement → rollback).
- `main` stays untouched; DNS stays on GitHub Pages until Callum runs the runbook.
- The redesign PR chain carries the corrected `deploy.yml` so `main` is safe to
  merge whenever Callum chooses.
