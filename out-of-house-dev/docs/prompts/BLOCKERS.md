# BLOCKERS — Phase B (redesign) branch `feat/redesign-v4`

Per the Autonomy Charter: build with the specified fallback, log the blocker
here with **what unblocks it**, and keep moving. Nothing here stops the branch
going green; several items gate the eventual **publish**, not the code.

Legend: 🔴 blocks publish · 🟡 gated / has a shipped fallback · 🟢 resolved in-branch.

---

## A. Business facts only Callum can supply (`[TODO:callum:]`)

Source of truth: `docs/content/legal_review_needed.md` §2. Each has a shipped
fallback so the branch is green; the real value is required before the relevant
copy goes live.

| # | Fact | Used in | Shipped fallback (what the branch does now) | Unblocked by |
|---|---|---|---|---|
| A1 | Legal entity name + registered/trading address | Terms, Privacy | Kept "available on request" pattern; new legal texts sit behind the publish flag (B6) | Callum supplies entity + address |
| A2 | ICO registration number | Privacy, Trust | Trust page keeps "details on request"; Privacy behind publish flag | Callum supplies ICO number |
| A3 | VAT registration status | Terms | New Terms behind publish flag; live Terms unchanged | Callum confirms VAT status |
| A4 | Effective dates (4 legal pages) | All legal | New texts behind publish flag; dates set at flip | Callum sets dates at publish |
| A5 | Cyber Essentials status | Trust | Trust behind flag; live copy unchanged | Callum confirms current status |
| A6 | `status.out-of-house.dev` exists? | Trust | Status-page link NOT added in new Trust until confirmed | Callum confirms the subdomain resolves |
| A7 | Real next-cohort dates + seat counts (6 courses) | learn / programmes.js | **Course detail + index render "dates announced at enrolment — apply and we'll confirm within one business day" and NO seats bar** (learn.md stale-cohort rule) | Callum supplies 6 real cohort dates + seat counts |
| A8 | LogoVault "900k+ logos indexed" | products / LogoVault | **Count dropped; "every format" (SVG/PNG/JPG) proof point used instead** (products.md gate) | Callum confirms the real indexed count |
| A9 | Retainer tier scope definitions (Light/Standard/Heavy) | pricing_review §1b, maintenance, home engagement card | ASSUMED scopes shipped verbatim from the content package (one workstream/weekly · 2–3 day/two workstreams · multiple + on-call) | Callum signs off or edits the scopes |

## B. Solicitor review (drafting ≠ legal advice)

🔴 The four new legal texts (`docs/content/legal-*.md`) require solicitor review
before publish — full scope in `legal_review_needed.md` §1 (Consumer Contracts
Regs cooling-off, liability cap enforceability, SaaS/LogoVault trademark
language, AI-processing controller/processor roles, sub-processor DPAs,
Companies Act display requirements). **Handled in-branch (B6):** all four new
texts ship behind a single `LEGAL_CONTENT` flag defaulting to the current live
content, so the flip is one commit once solicitor + facts are in.

## C. Render cutover publish-gate

🟡 Privacy, Sub-processors and Trust describe the Render architecture and must
publish **with** the Render cutover, not before (audit §2; `legal-privacy.md`
header). **In-branch:** new texts behind the same publish flag. The **one
exception shipped now** is the Trust-page hosting fallback line (the live page
already over-claims Render hosting — the fallback fixes an existing accuracy
issue and is safe to ship). Unblocked by: Callum approving the cutover runbook
(`docs/runbooks/hosting-cutover.md`, B8) and running it.

## D. Stripe care-plan SKUs (from pricing_review §3D)

_(Filled in during B5 — see entry below once the price book is checked.)_

## E. Environment blockers hit during this run

- 🟡 **No network egress to the live site.** B0 requires "before" screenshots of
  every public route against live `https://out-of-house.dev`. This sandbox has
  **no outbound network** (curl to the live apex times out, HTTP 000 after 34s).
  **Mitigation shipped:** the current v4 working copy carries the same v3 visual
  design the live site serves (the v4 migration kept the UI unchanged — MASTER_PROMPT
  §0.A rule 9), so `apps/web/scripts/capture-screenshots.mjs` captures all 28
  public routes against a **local production build** into
  `docs/audit/screenshots/2026-07-live/`. The script is reusable for the "after"
  set (same command, different `OUT_DIR`). Unblocked by: running the script from
  a networked machine against the live URL if a pixel-exact live baseline is ever
  needed (not required for the redesign diff).
- 🟡 **Authed `/app/*` shells not screenshotted in B0.** Capturing them needs the
  full api+jobs+Postgres stack running with seeded auth cookies — impractical to
  stand up purely for a static "before" baseline, and the authed app is
  restyle-don't-rewire (shared primitives), so before/after visual diffs are
  captured on the marketing surface. Unblocked by: `npm run dev` (api+jobs+web)
  with a seeded admin session if authed before/after shots are wanted.
