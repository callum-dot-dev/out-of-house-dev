# OUT-OF-HOUSE.DEV — BRAND & FRONTEND REDESIGN — MASTER PROMPT

> **How to use this file — two phases, two agents, in order:**
>
> **Phase A (Fable 5 — this document run in a Fable 5 session, NOT handed to
> Claude Code first):** service-line audit, pricing sanity check, and all
> site content authorship (§3.4, §3.6). Fable 5 produces the finished content
> package — copy, terms, everything listed in §3.6 — as files in
> `docs/content/`. Do not proceed to Phase B until this package exists.
>
> **Phase B (Claude Code / Opus 4.8):** paste this document as the first
> message at the repo root (`out-of-house-dev/`, the npm workspace root
> inside the `callum-dot-dev/out-of-house-dev` git repo) to implement the
> design system and wire the pages using the content package Fable 5 already
> wrote. Opus 4.8 is the **implementation agent only** for anything
> user-facing in text — see §0.F. It still owns all code, styling, and
> component architecture.
>
> This is a companion to `docs/prompts/MASTER_PROMPT.md` (the v4 Render
> migration prompt, accepted 2026-06-08, see
> `docs/adr/0001-render-migration.md`) — it does NOT replace that document,
> it supersedes ONE line of it (see §0.C) and picks up where it left off: the
> backend/data-layer migration is done or in flight; this prompt is scoped to
> **brand identity, UI/UX, information architecture, and the customer-facing
> functionality that depends on them**.

---

## 0 · OPERATING RULES — read first

### 0.A This is a real client-facing brand, not a placeholder

out-of-house.dev is live in demo/early-access form. The redesign must ship as
production-quality work, not a mockup. Where you're not sure whether
something is a hard requirement or your own judgment call, decide it yourself
and log it as a 10-line ADR in `docs/adr/` — do not stop to ask. Record
anything assumed with an `ASSUMED:` prefix in the relevant PR or
`docs/prompts/PROGRESS.md` entry.

### 0.B Verify the ground truth before designing anything

Two things may have drifted out of sync and you must reconcile them as your
first work item, not assume either is correct:

1. **Repo state.** This repo (`out-of-house-dev`) is a v4 monorepo:
   `apps/web` (CRA frontend, React 18 + react-router, plain CSS in
   `src/styles/v3.css` + `App.css`, no Tailwind/CSS-in-JS installed today),
   `apps/api`, `apps/jobs`, `apps/builder` (TypeScript, Render-targeted),
   `packages/shared`. `docs/adr/0001-render-migration.md` and
   `docs/prompts/MASTER_PROMPT.md` describe the backend migration off
   Supabase onto Render + Postgres.
2. **Live site state.** As of the last known deploy, production
   (`out-of-house.dev`) was still served by GitHub Pages from a `gh-pages`
   branch, built via a workflow that may predate this monorepo layout —
   there is a real risk the deployed build is stale relative to `apps/web`,
   or that the current GitHub Actions build script no longer targets the
   right workspace. **Do not assume Render hosting is live.** Check the
   actual GitHub Actions run history, the `gh-pages` branch contents, and the
   DNS/CNAME setup, then confirm in your audit doc: what's actually deployed
   right now, from which branch/workflow, versus what the code in `main`
   would produce if built today.

Ship your findings as `docs/audit/2026-07_current_state.md`: every route in
`apps/web/src/pages` + `App.js`, a screenshot of each as currently live,
and the hosting reconciliation above.

### 0.C The one rule from MASTER_PROMPT.md this supersedes

MASTER_PROMPT.md §0.A rule 9 said "keep the existing UI working... you are
swapping its data layer, not redesigning it." That instruction is now
**overridden for the frontend design system and page layouts only.** Do not
re-open or redo the backend/data-layer work MASTER_PROMPT.md already
specified (auth, API client, jobs, LLM router, storage) unless your audit in
§0.B finds it genuinely broken — in that case, fix it and log why, but treat
it as out of scope for the redesign itself.

### 0.D Confidentiality inside the product

The real delivery mechanism — client requests get triaged and merged into a
single consolidated Claude Code prompt, run by us against an Obsidian-backed
knowledge base per project, kept strictly isolated project-to-project — is
internal operating detail (see the vault's `09_claude_orchestrator.md` and
MASTER_PROMPT.md A7). Nothing in the redesigned UI, marketing copy, code
comments, or public docs should describe this mechanism. Client-facing
language should describe outcomes and turnaround, never the internal
pipeline. Treat this constraint as a design input, not just a copy note — it
affects what a "project updates" or "request a change" UI is allowed to show
a client (progress/status, not "your request was merged into batch #4").

### 0.E Guardrails that don't change

- Branch model: `feat/*` → `dev` → `staging` → `main`. Never commit directly
  to `main`. Never push/merge `main` without explicit go-ahead. Never
  `git add -A` — stage intentionally.
- Conventional commits, one per logical unit of work.
- Don't break the authed app (`src/pages/app/*`, `AuthProvider.js`,
  `ProtectedRoute.js`) or its wiring to `apps/api` while restyling it.
- Accessibility is not optional: WCAG AA contrast minimum, visible focus
  states, `prefers-reduced-motion` respected for anything with motion.

### 0.F Content authorship stays with Fable 5, not the build agent

MASTER_PROMPT.md's Autonomy Charter tells the build agent to never stop and
just decide things itself — that's the right rule for code, but wrong for
marketing copy, service descriptions, and legal text, which need Callum's
actual business judgment, not a plausible-sounding autonomous guess. So, for
this prompt only, that rule is narrowed:

- **Opus 4.8 (Phase B) does not originate new user-facing copy.** It pulls
  page content, pricing copy, and legal text verbatim (or with only
  structural/markup adaptation) from the `docs/content/` package Fable 5
  produced in Phase A.
- **If content is missing for a page or component Phase B needs to build,
  that is a real blocker** — log it in `docs/prompts/BLOCKERS.md` and skip
  to the next independent task, per the existing Autonomy Charter blocker
  handling. Do not paper over a missing content file by writing placeholder
  marketing or legal copy "for now."
- Code-level strings that aren't customer-facing prose (button labels
  derived from content, aria-labels, commit messages, ADRs, code comments)
  are unaffected — Opus 4.8 writes those normally.

---

## 1 · BUSINESS CONTEXT (for design decisions, not for the UI to explain)

out-of-house.dev sells senior-engineer delivery — websites, web apps, custom
software, AI automations, maintenance, coaching, courses, and a handful of
SaaS products — under one positioning: **clients pay for exactly the scope
they need, nothing bundled in.** A website's price and its ongoing
maintenance fee scale with the number of pages, features, and complexity
selected, not a flat tier. This pricing logic already exists in
`src/PricingCalculator.js` and `src/data/services.js` /
`src/data/planTemplates.js` — audit these before designing new pricing UI,
and keep the redesigned calculator wired to the same data rather than
duplicating pricing logic in a new component.

The core design problem to solve: **a first-time visitor should understand
"pay only for what you use, priced by what you actually need" from the hero
section alone**, without reading paragraphs of copy, and should then be able
to navigate to their specific service, see transparent pricing, and start a
request — all with less friction than the current demo has today.

---

## 2 · BRAND & DESIGN REFERENCES

Visit and analyze each of these before designing anything. Don't clone any
of them — synthesize a system that (a) fits the existing out-of-house.dev
logo (`src/images/out-of-house-logo.png` — check its palette and mark before
picking new colors), and (b) is defensibly original. For each site, produce
a short written breakdown in your audit doc of *what specifically to borrow*
and *why it serves our goal* — not just "I like the vibe."

- **wisprflow.ai** — study how the hero communicates the entire value
  proposition through layout and a single focal visual rather than copy
  volume; the restraint in how much is shown per scroll section; the pastel
  palette and how it's applied to CTAs/surfaces without looking generic-SaaS.
  Borrow: information density discipline, hero clarity, pastel-driven but
  purposeful color use.
- **sui.io** — study how scroll-driven interaction and motion make the site
  feel like a designed experience rather than a static page, and how they
  keep it performant and not gimmicky. Borrow: selective, purposeful
  interactivity (not full 3D/WebGL parity — evaluate load-time cost before
  proposing anything heavy) and a sense of "this site is a product too."
- **faunarobotics.com** — study how a soft, playful palette still reads as
  sleek/modern/technical rather than childish, and how their layout supports
  that duality. Borrow: the balance of playful-but-premium, and how
  typography/spacing keep a soft palette from feeling unserious.

Deliverable from this step: `docs/design/inspiration_analysis.md` and a
proposed `docs/design/design_tokens.md` (color palette with rationale tied
to the existing logo, type scale, spacing scale, motion principles,
component states) before touching any component code.

---

## 3 · SCOPE OF WORK

### 3.1 Information architecture & navigation

Audit the current nav (`src/Header.js`) and full route list
(`src/App.js`) and propose a simplified IA: fewer top-level nav items,
clearer grouping of the eleven-ish service lines, a single obvious path from
"what do you offer" → "what would this cost me" → "start a project." Cut or
consolidate anything a first-time visitor wouldn't need to find.

### 3.2 Visual design system

Build the design system defined in §2 as reusable primitives (whatever
styling approach you choose — Tailwind, CSS modules, or continuing with
plain CSS in `src/styles/` — pick one and justify it in an ADR; don't mix
approaches ad hoc). Cover: buttons, cards, form inputs, nav, footer,
pricing/calculator UI, status/badge components, empty states, and the authed
dashboard shell.

### 3.3 Page-by-page redesign

Apply the system across every marketing and service page currently in
`src/pages/` and the root-level pages (`Showcase.js`, `Developers.js`, etc.)
plus the authed app under `src/pages/app/`. Rewrite copy where it's
overloaded or unclear, in service of the "understand what we do from the
hero, without being overloaded" goal — but don't invent new pricing or
service facts; source copy changes from the existing `src/data/*.js` files
and flag anything that looks factually stale.

### 3.4 Service-line audit & pricing sanity check — Fable 5, Phase A, before any UI work

Before anyone touches the calculator's code, Fable 5 must go through **every
service line we actually offer** (websites, web apps/SaaS, custom software,
AI automations, maintenance, coaching, courses, lead engine, AISEO, the
LogoVault/SaaS products — the full list is in `src/data/services.js`,
`src/data/planTemplates.js`, and MASTER_PROMPT.md §1's revenue-line table)
and sanity-check the pricing logic on its own terms, not just confirm it's
wired up:

- For each service line, pick at least three points along its complexity/
  feature range (minimal, typical, complex) and check: does the quoted
  one-off price and the resulting monthly maintenance figure make sense
  *as a human offer*, not just as a number a formula produced? Flag anything
  where maintenance looks disproportionate to build price, where adding one
  feature causes a price jump that doesn't track the actual extra work, or
  where a low-complexity option is priced in a way that would attract the
  wrong kind of client.
- Cross-check against the fixed prices already committed elsewhere
  (MASTER_PROMPT.md §1's table, the course/coaching prices in Appendix A) —
  the calculator's *derived* prices should never contradict a *fixed* price
  quoted somewhere else on the site for the same thing.
- Write the findings, and any pricing-logic changes you recommend, to
  `docs/content/pricing_review.md` before implementation starts. If you
  change a formula or a base rate, say so explicitly — this is a
  business-judgment call, not a code refactor, and should read like one.

Only after this review exists does Phase B trace it through
`PricingCalculator.js` → `services.js`/`planTemplates.js` → (per
MASTER_PROMPT.md Appendix A) the Stripe price book, implement Fable 5's
corrections, and flag any backend/Stripe gap rather than re-implementing
billing logic that's already scoped elsewhere.

### 3.5 Hosting

Per §0.B, reconcile actual vs intended hosting. If Render hosting for
`apps/web` isn't live yet, this prompt's build should include getting it
there (static site on Render per ADR 0001, alongside `apps/api`), since a
redesign is the natural point to cut over. Don't touch `apps/api`/`apps/jobs`
Render config unless your audit finds it broken.

### 3.6 Content authorship — Fable 5, Phase A, before Phase B starts

Fable 5 writes the actual words. Not placeholder copy for Opus 4.8 to
"finish later," not an outline for the build agent to flesh out — finished,
publish-ready content, delivered as files in `docs/content/` that Phase B
then implements verbatim. This covers every page in scope for the redesign
(§3.3), which includes but is not limited to:

- Hero and service-line copy for every page under `src/pages/` and the
  root-level marketing pages (`Showcase.js`, `Developers.js`, etc.) —
  written to hit the "understood in one hero, no overload" goal from §1.
- Pricing-page and calculator copy (the numbers come from §3.4's review;
  the words explaining them come from here).
- **Terms and Conditions, Privacy Policy, Subprocessors, and Trust page**
  content (`TermsAndConditions.js`, `PrivacyPolicy.js`, `Subprocessors.js`,
  `Trust.js`) — rewritten for clarity consistent with the new IA, kept
  accurate to how the business actually operates. Flag explicitly in
  `docs/content/legal_review_needed.md` that legal/compliance-sensitive
  pages (Terms, Privacy, Subprocessors) should get an actual solicitor's
  review before publishing — Fable 5 drafting them is not a substitute for
  that, especially for UK data-protection/consumer-contract obligations.
- Any client-facing status/progress copy for the authed app (§0.D applies:
  describe outcomes and turnaround, never the internal request-batching
  mechanism).

Phase B is not permitted to invent or materially alter this content — see
§0.F.

---

## 4 · DELIVERABLES

**Phase A (Fable 5):**

1. `docs/audit/2026-07_current_state.md` — current site + hosting audit (§0.B).
2. `docs/design/inspiration_analysis.md` + `docs/design/design_tokens.md` (§2).
3. `docs/content/pricing_review.md` — the service-line pricing sanity check
   and any recommended formula/rate changes (§3.4).
4. `docs/content/*` — the finished content package: page copy, Terms and
   Conditions, Privacy Policy, Subprocessors, Trust, authed-app status copy
   (§3.6), plus `docs/content/legal_review_needed.md`.

**Phase B (Claude Code / Opus 4.8), building on the above:**

5. Updated `apps/web` components/pages implementing the new design system
   (§3.1–3.3) with Fable 5's content and corrected pricing logic (§3.4) wired
   in verbatim, not rewritten.
6. Before/after screenshots (Playwright, already configured in
   `apps/web/e2e`) for every redesigned page.
7. Hosting cutover (or a documented reason it's deferred) (§3.5).
8. `docs/adr/000X-*.md` entries for every open decision made (styling
   approach, palette rationale, IA changes, hosting).
9. An updated `docs/prompts/PROGRESS.md` entry describing what shipped, what
   was deferred, and why.

## 5 · GATE

Phase A is done when the content package and pricing review exist and read
like finished, considered work — not a first draft. Phase B is done when:
every route renders with the new system and Fable 5's content, no console
errors, Lighthouse accessibility ≥ 90 and performance not regressed vs. the
current live site, the pricing calculator's output matches
`docs/content/pricing_review.md` exactly (not the pre-redesign numbers,
where Fable 5 changed them, and with the change logged), `npm run build:web`
succeeds, and `npm run typecheck`/`npm run lint` pass repo-wide. Run a
fresh-eyes verification pass (subagent, if available) against this
checklist before the final commit — including a check that no page ships
with copy that doesn't match the Phase A content package.
