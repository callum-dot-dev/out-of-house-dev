# PR: Brand & frontend redesign (`feat/redesign-v4` → `dev`)

The build sandbox has **no network egress**, so the branch could not be pushed
and the PR could not be opened from the automated run. Everything is committed
locally and green. This file is the ready-to-use PR description + the exact
commands to push the branch, create the `dev` base (it doesn't exist yet — the
monorepo has never been pushed), and open the PR.

---

## Commands (run from the repo root — the folder ABOVE `out-of-house-dev/`)

```bash
# 1. Create the dev base from the completed v4 platform (pre-redesign state),
#    since the monorepo has never been pushed and dev doesn't exist yet.
git push origin feat/v4-render-platform:dev

# 2. Push the redesign feature branch (its first appearance on the remote — fine).
git push -u origin feat/redesign-v4

# 3. Open the PR into dev (title + body below; --body-file uses this doc).
gh pr create --base dev --head feat/redesign-v4 \
  --title "Brand & frontend redesign (Phase B)" \
  --body-file out-of-house-dev/docs/prompts/PR_feat-redesign-v4.md
```

> Do NOT merge to `main` or touch DNS/gh-pages here — that's the gated hosting
> cutover (`docs/runbooks/hosting-cutover.md`), your call, separately.

---

## What this PR does

Implements the Phase A design + content package (PHASE_B_PROMPT.md, B0–B9): a
sharpening of the v3 design into a token-driven system, a five-item IA, the
homepage rebuilt around the pricing calculator as proof, corrected calculator
pricing, and hosting-cutover prep — restyle, not rewire. The authed platform
(`/app/*`, auth, API wiring) keeps working throughout.

### Highlights
- **Design system:** `styles/tokens.css` (design_tokens §1–4) + a WCAG contrast
  gate in CI; `styles/primitives.css` completes the six-state contract.
- **IA:** five nav items (Build · Learn · Products · Pricing · Company); every
  route preserved.
- **Homepage:** price-proof hero strip (replaces the hardcoded workshop panel),
  "we're the fourth option" foil cards, a six-card services router (replaces the
  accordion), updated pricing cards, guarded calculator.
- **Calculator:** logic moved to `data/pricing.js` per pricing_review §1; all 8
  acceptance values unit-tested (`npm run test:web`).
- **Accessibility:** fixed systemic small-text contrast debt (darkened
  `--accent-deep`, added `--info-text`); axe WCAG-AA clean on sampled routes bar
  one intentional dimmed-preview pattern.

### Verification (B9 checklist)
- `npm run build:web` ✅ · `npm run typecheck` ✅ · `npm run lint` (eslint +
  contrast gate) ✅ · `npm test` (backend) 41/41 ✅ · `npm run test:web`
  (calculator) 18/18 ✅.
- Fresh-eyes content audit vs `docs/content/`: **no discrepancies** (prices,
  gates, verbatim copy).
- Console: zero JS/render errors (offline capture only shows
  `ERR_CONNECTION_REFUSED` to the API, which isn't running in the sandbox).
- Accessibility (`npm run a11y`, axe = the Lighthouse a11y engine): 0 serious
  violations on `/`, a service page, `/coaching`, `/aiseo`, `/courses`,
  `/lead-engine`, `/trust`, `/apply` — except the HorizontalSteps dimmed inactive
  cards, an intentional ADOPT progressive-disclosure pattern (the active card is
  full-contrast; reduced-motion/mobile renders full).
- Before/after screenshots (like-for-like) in `docs/audit/screenshots/`.

## ⚠️ Two things the reviewer must know

### 1. The `deploy.yml` "time bomb" is defused (audit §2)
Remote `main` still holds the pre-v4 flat CRA whose root `deploy.yml` runs
`npm run build` at the workspace root — which produces no web bundle on this
monorepo and would fail the instant the monorepo reaches `main`. This PR ships a
**patched `.github/workflows/deploy.yml`** (build:web + publish
`apps/web/build`, dispatch-only) so it can't auto-fail and stays a working
GitHub Pages rollback. Primary hosting is the Render static site in `render.yaml`
(now with HSTS + hardening headers). See ADR 0006 + `hosting-cutover.md`. **On
the eventual `main` merge, keep this branch's `deploy.yml`, not main's.**

### 2. New legal content is publish-gated
The four new legal texts (Terms/Privacy/Sub-processors/Trust) are drafted
verbatim behind `PUBLISH_NEW_LEGAL` (default **false**) in
`apps/web/src/config/flags.js`. The pages keep serving the current (18 May)
content until (a) the `[TODO:callum:]` facts are supplied, (b) a solicitor
reviews them, and (c) the Render cutover happens (Privacy/Sub-processors/Trust
describe the Render architecture). Flipping the flag to `true` is the one-commit
publish. The **one exception shipped now** is the Trust-page hosting-fallback
line (it corrected an existing over-claim). Nothing ships with an unresolved TODO.

## Open blockers (all have shipped fallbacks — none block this branch)

Full detail in `docs/prompts/BLOCKERS.md`:
- **A. Callum facts:** legal entity/address, ICO number, VAT status, effective
  dates, Cyber Essentials status, status-page existence, **6 real cohort dates +
  seats**, **LogoVault indexed count**, retainer tier scopes. Each has a shipped
  fallback (e.g. cohorts show "dates announced at enrolment"; the 900k claim is
  dropped).
- **B/C. Solicitor review + Render cutover gate** for the legal pages.
- **D. Stripe care SKUs:** `OOH-CARE-AUTO/APP/CUSTOM` are absent from the price
  book — logged, not invented (the calculator surfaces them as estimates only).
- **E/F. Environment:** live site + git remote unreachable from the sandbox →
  before-shots taken from a local pre-redesign build; this PR opened manually.

## What's left for Callum
Supply the 12 facts, get solicitor sign-off, approve this PR chain
(`feat/redesign-v4` → `dev` → `staging` → `main`), and run the hosting-cutover
runbook when ready. `main` is untouched.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_011sr52ar1Mh9syrCD1uJwom
