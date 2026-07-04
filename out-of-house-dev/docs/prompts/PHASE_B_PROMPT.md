# PHASE B — Frontend redesign implementation (Opus 4.8 / Claude Code)

> **Callum: paste exactly this one line into Claude Code at the workspace root (`out-of-house-dev/`, the folder containing `apps/` and `docs/`):**
>
> `Read docs/prompts/PHASE_B_PROMPT.md in full and execute it end to end. It is self-contained; do not wait for further input.`

Authored by Fable 5 on 2026-07-04, immediately after completing and verifying Phase A. This document is the **complete Phase B brief**: it embeds everything Phase A learned, maps every file you must consume, and defines the work order and gates. Where it conflicts with your memory of anything, this document and the files it points to win. `docs/prompts/FRONTEND_DESIGN_PROMPT.md` remains authoritative for the redesign rules (§0.A–0.F there); `docs/prompts/MASTER_PROMPT.md`'s Autonomy Charter governs how you operate (never stall, decide + log ADRs, unlimited subagents, `docs/prompts/BLOCKERS.md` instead of stopping).

---

## 0 · Non-negotiables (compressed; full text in FRONTEND_DESIGN_PROMPT §0)

1. **Branch model:** `feat/*` → `dev` → `staging` → `main`. Work on `feat/redesign-v4`. **Never commit to `main`; never push/merge `main` without Callum's explicit go-ahead.** Conventional commits, one per logical unit, never `git add -A`. End state of this run: a green `feat/redesign-v4` branch + a PR into `dev` — not a deploy.
2. **Content is law (§0.F):** every user-facing string comes verbatim from `docs/content/`. `ADOPT file#field` markers mean the existing text in that data file/component is the approved final copy — keep it byte-for-byte. If copy you need is missing: log to `docs/prompts/BLOCKERS.md`, build the component with the existing (old) copy in place, move on — this operationalises §0.F's "skip to the next independent task": keeping already-live copy is not placeholder-writing; inventing new copy is. **Never write placeholder marketing or legal copy.** Non-prose strings (aria-labels, commit messages, ADRs, code comments) you write normally.
3. **Confidentiality (§0.D):** nothing in UI, copy, comments, or docs describes the internal delivery pipeline (request consolidation, orchestration, vault). Client-facing language = outcomes and turnaround. `docs/content/app-status.md` is pre-cleared; stay inside it.
4. **Don't break the platform:** `src/pages/app/*`, `lib/AuthProvider.js`, `lib/ProtectedRoute.js`, and the `apps/api` wiring keep working throughout. Restyle, don't rewire. Backend/data-layer work from MASTER_PROMPT is done or out of scope — do not reopen it unless you find it broken (then fix minimally + log).
5. **Accessibility:** WCAG AA contrast, visible focus states everywhere, `prefers-reduced-motion` respected. `docs/design/design_tokens.md` §5/§7 are the contract.
6. **Decisions:** anything open, decide yourself and log a 10-line ADR in `docs/adr/` (next numbers after 0002). Prefix assumptions `ASSUMED:`.

## 1 · Ground truth you would otherwise rediscover (verified 2026-07-04; full audit in `docs/audit/2026-07_current_state.md` — read it first)

- **GitHub `main` is NOT this codebase.** Remote `main` still holds the pre-v4 flat CRA app (react-scripts at the subfolder root, Supabase deps). This v4 monorepo has never been pushed. Expect your first push of `feat/redesign-v4` to be the monorepo's first appearance on the remote — that is fine on a feature branch.
- **Live production** (`https://out-of-house.dev`) = GitHub Pages, `gh-pages` branch, bundle `main.8dc2b53a.js`, deployed 2026-06-27 from `main`'s flat CRA by root `.github/workflows/deploy.yml`. DNS at IONOS: apex A → 185.199.108–111.153, `www` CNAME → `callum-dot-dev.github.io`. **Render is not live.**
- **The deploy.yml time bomb:** the root workflow runs `npm run build` at the workspace root and publishes `out-of-house-dev/build`. On the monorepo, root `npm run build` compiles only the TS apps (web is `npm run build:web` → `apps/web/build`) and the publish dir won't exist → the workflow fails the moment the monorepo reaches `main`. **Your hosting work (§3.8) must land in the same PR chain**, but the actual `main` merge + DNS flip stay gated on Callum.
- **Stale artifacts:** workspace-root `build/` (May 22) and `apps/web/build/` (Jun 8) are stale local builds; ignore both.
- **Styling today:** plain CSS — `apps/web/src/App.css` (~187 KB, includes the v3 token block the new tokens extend) + legacy `src/styles/v3.css`. No Tailwind/CSS-in-JS installed.
- **Calculator prices currently live inside `PricingCalculator.js`**, not in `src/data/` — you will move them (§3.5).

## 2 · Required reading, in order (all in-repo)

| # | File | Why |
|---|---|---|
| 1 | `docs/audit/2026-07_current_state.md` | Ground truth: hosting reconciliation, full route inventory (§3 = your page checklist), styling debts |
| 2 | `docs/design/design_tokens.md` | The token system: colours (incl. `--accent-text` contrast rule), type, spacing, motion, six component states, a11y gate |
| 3 | `docs/design/inspiration_analysis.md` | The design argument: hero = claim + calculator-as-proof, one claim per section, numbered progression, 5-item nav target |
| 4 | `docs/content/README.md` | The content-consumption contract (ADOPT / TODO conventions) |
| 5 | `docs/content/pricing_review.md` | **Binding numbers.** §1a–1e = calculator implementation spec; §2 worked examples = acceptance values |
| 6 | `docs/content/home.md` | Homepage, section by section |
| 7 | `docs/content/services-build.md` + `services-growth-care.md` | All six `/services/:slug` pages |
| 8 | `docs/content/learn.md` | Coaching, courses (incl. the blocking stale-cohort rule), /verify |
| 9 | `docs/content/products.md` | /saas, LogoVault, /lead-engine (incl. the softened SDR stat), /aiseo |
| 10 | `docs/content/company.md` | /developers, /showcase, /changelog, auth microcopy, /auth/callback, 404 |
| 11 | `docs/content/app-status.md` | Authed-app statuses, empty states, notifications — §0.D-cleared |
| 12 | `docs/content/legal-terms.md`, `legal-privacy.md`, `legal-subprocessors.md`, `legal-trust.md` | Full legal texts — **publish-gated, see §3.7** |
| 13 | `docs/content/legal_review_needed.md` | The 12 open `[TODO:callum:]` facts + solicitor scope — your blocker source of truth |
| 14 | `docs/adr/0001-render-migration.md` | Hosting target for §3.8 |

Optional background (outside the repo, read-only, skip if inaccessible): Callum's vault at `C:\Users\CSaxo\Documents\Claude\Projects\Systemisation\Projects\out-of-house.dev\` — `02-Notes\Current State.md` and `04-Logs\2026-07-04 — Redesign Phase A package shipped.md`. Nothing in them is required; everything binding is in-repo.

## 3 · Work order

### B0 — Baseline + "before" screenshots
Branch `feat/redesign-v4` off the current working state. `npm install`; confirm `npm run build:web`, `npm run typecheck`, `npm run lint` green **before** touching anything (if not green, fix minimally, commit separately, log). Then capture "before" screenshots with Playwright (`apps/web/e2e` is configured): every public route in audit §3 against **live** `https://out-of-house.dev`, and the authed `/app/*` shells against a local dev server (seeded/dev auth if available; skip-and-log any page you can't reach). Store in `docs/audit/screenshots/2026-07-live/`. Commit.

### B1 — Styling ADR + tokens
Write the styling-approach ADR (recommendation from Phase A's audit: stay with plain CSS custom properties + split the 187 KB `App.css` monolith into layered files — tokens / primitives / sections / pages — no new framework; decide yourself and log). Implement `docs/design/design_tokens.md` §1–§4 as the token layer, including `--accent-text` and the pastel tints. Add the automated contrast check over token pairs (design_tokens §7) to CI (a small script + `npm run lint` hook is fine). Font decision (Poppins self-host vs system) per design_tokens §2 — ADR it.

### B2 — Primitives
Build/refactor the primitive set with all six states from design_tokens §5: buttons (primary = ink fill, NOT green fill), cards, form inputs, nav, footer, badges (request + project status variants), empty states, calculator controls, dashboard shell chrome. Playwright component sanity where cheap.

### B3 — IA + navigation
Implement the simplified IA. Target from inspiration_analysis §Synthesis: **five top-level items** (Build · Learn · Products · Pricing · Company or equivalent — final call is yours, ADR it with the before/after nav tree). Preserve every existing route (redirects where paths change); the audit's route table is the completeness checklist.

### B4 — Pages, content verbatim
Rebuild in this order (highest traffic/impact first): `/` per `home.md` (hero price-proof strip replaces the hardcoded workshop panel; services router replaces the accordion; guard line above the calculator) → six service pages per the two services files (price-anchor block component, shared) → learn pages (**enforce the stale-cohort rule: never render a past date or fake seats**) → products pages (LogoVault 900k-claim gate; lead-engine SDR-stat substitution) → company/auth pages → authed app restyle with `app-status.md` strings. Every `[TODO:callum:]` you hit: implement the specified fallback if the content file gives one; otherwise BLOCKERS.md + move on.

### B5 — Calculator (binding spec: pricing_review §1)
Move constants to `src/data/pricing.js`; implement: website base £500 **includes 5 pages** (`oneOff = 500 + max(0, pages−5)×150`, slider 1–15); webapp base **£4,000**; automation/custom unchanged; Care ladder £100/£150/£300/£400 by type replacing flat hosting add-on; add-on visibility rules (AI features + CMS hidden for automation); microcopy from `home.md` §09. **Acceptance values (must reproduce exactly):** 8-page site + CMS = £1,350; 15p + CMS + AI = £3,000; 3 workflows = £1,550; 10 workflows = £4,350; 5-feature webapp + auth + AI = £7,900; 10-feature + all add-ons = £11,300; 4-module custom + auth = £6,800; 10-module + all = £12,600. Write these as unit tests. Then check Stripe (via `scripts/stripe-sync.ts` config or Appendix A price book) for `OOH-CARE-AUTO/APP/CUSTOM`; absent → BLOCKERS.md entry, do not invent price IDs or touch billing logic.

### B6 — Legal pages (publish-gated)
Build the four pages from the `legal-*.md` texts **but**: they describe the Render architecture and carry unresolved TODOs, so until (a) the Render cutover is approved and (b) `legal_review_needed.md` facts are supplied, the routes keep serving the **current** (18 May) content with ONE exception — apply the Trust-page fallback line from `legal-trust.md` (the live page over-claims Render hosting today; the fallback fixes an existing accuracy issue and ships now). Implement the new texts behind a single flag/constant so the flip is one commit. Log the gate in the PR description and BLOCKERS.md.

### B7 — Motion + polish
The three sanctioned motion patterns only (design_tokens §4): reveal fade-ups, process-section progress marker, ≤140 ms micro-feedback. Keep the cursor-spotlight (already reduced-motion-gated). Nothing else.

### B8 — Hosting (§3.5 of the design prompt)
Prepare the Render cutover per ADR 0001: static-site service for `apps/web` in `render.yaml` (build `npm run build:web`, publish `apps/web/build`, SPA rewrites, security headers incl. HSTS), plus a replacement `.github/workflows/deploy.yml` **staged in the feature branch** (either retired in favour of Render auto-deploy, or patched to `build:web` + `publish_dir: out-of-house-dev/apps/web/build` as the documented fallback). Write `docs/runbooks/hosting-cutover.md`: exact click-path for Callum — Render service creation, custom-domain add, IONOS DNS change (apex A records → Render, or ALIAS per Render docs; `www` CNAME), TLS verify, gh-pages retirement, rollback path. **You do not flip DNS, merge to `main`, or unpublish gh-pages — the runbook + gated PR is the deliverable.** ADR the hosting decision.

### B9 — Verification + closeout (gate from FRONTEND_DESIGN_PROMPT §5)
Fresh-eyes subagent pass against this checklist before the final commit: every route renders with the new system and Phase A content; **no page ships copy that doesn't match `docs/content/`** (spot-check by diff, especially prices); zero console errors; Lighthouse accessibility ≥ 90 on `/`, one service page, `/coaching`, `/aiseo`, `/app` shell as the minimum sample — plus any route your fresh-eyes subagent flags; any failing route gets fixed, not excluded; performance not regressed vs the live-site baseline captured in B0; calculator unit tests green (B5 values); `npm run build:web`, `npm run typecheck`, `npm run lint` pass repo-wide; after-screenshots for every redesigned page paired with B0's befores. Then: ADRs complete (styling, palette rationale, IA, hosting, + any ASSUMED calls), `docs/prompts/PROGRESS.md` entry (shipped / deferred / why), PR from `feat/redesign-v4` → `dev` with a description covering the deploy time bomb, the legal publish gate, and the BLOCKERS list.

## 4 · Blockers you can predict (do not stall on any of them)

From `legal_review_needed.md` §2 — legal entity/address, ICO number, VAT status, effective dates, Cyber Essentials status, status-page existence, six real cohort dates + seat counts, LogoVault index count, retainer tier scope sign-off. Every one has a specified fallback or gate; build with fallbacks, list them all in BLOCKERS.md with what unblocks each, and keep moving.

## 5 · Definition of done

Green `feat/redesign-v4`, PR open into `dev`, B9 checklist attached to the PR, BLOCKERS.md complete, runbook ready, `main` untouched. Callum's remaining moves are: supply the 12 facts, solicitor sign-off, approve the PR chain, and run the cutover runbook.
