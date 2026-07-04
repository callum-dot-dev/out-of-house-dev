# Pricing review — every service line, sanity-checked as a human offer

Date: 2026-07-04 · Author: Fable 5 (Phase A, §3.4) · Status: **decisions in here are business-judgment calls, written to be implemented verbatim by Phase B.** Where a number changes, it says so explicitly. Sources audited: `PricingCalculator.js`, `data/services.js`, `data/programmes.js`, `data/saasApps.js`, `data/leadgen.js`, `data/aiseo.js`, homepage pricing cards (`App.js`), MASTER_PROMPT.md §1 revenue table + Appendix A price book.

## 0. Verdict in one paragraph

The fixed price book (courses, coaching, retainers, lead engine, AISEO, LogoVault) is internally consistent and market-sane — **no fixed price changes**. The calculator is where the problems live: it contradicts two committed prices (starter-site page count, web-app floor), applies a flat £100/mo "maintenance" to £10k+ builds that the retainer price book prices at £1,500+/mo, and offers add-ons that make no sense for some build types. Fixes below are surgical, not a re-pricing.

## 1. Calculator changes (CHANGED — Phase B implements exactly this)

### 1a. Build types

| id | base | per-unit | change & reasoning |
|---|---|---|---|
| website | £500 **includes up to 5 pages**; +£150/page from page 6; slider 1–15 pages | £150 | **CHANGED (formula).** Today £500 buys 1 page and page 5 costs £1,100 — but the homepage Starter card promises "Up to 5 pages … £500" and has since at least May. The card is the committed, advertised offer; the calculator must not quote a visitor more for the same thing. `oneOff = 500 + max(0, pages−5) × 150`. |
| automation | £750 | £400/workflow | Unchanged. £750 entry matches the card, §1 (£750–£20k), and the FAQ. Ten workflows → £4,350: sane for wiring ten typical workflows; complex multi-agent scopes are call-quoted (guard copy, §1d). |
| webapp | **£4,000** (was £2,500) | £600/feature | **CHANGED (base).** MASTER_PROMPT §1 commits web apps/SaaS at "from £4k"; the calculator undercuts the committed floor by 37%, and £2,500 for a senior-built MVP with 30 days of fixes attracts exactly the price-shopping clients the positioning avoids. Typical: 5 features + auth + AI = £7,900 — believable and still aggressive. Sub-label: "from £4,000". |
| custom | £3,500 | £800/module | Unchanged base. §1's table says "£3k–£50k"; the site should say **from £3,500** everywhere (the calculator's number). One floor, one story; the §1 table's £3k is superseded by this review. |

### 1b. The care gap (CHANGED — the biggest fix)

Today one add-on, "Hosting and maintenance £100/mo", applies to every build type. But the price book prices website care at £100/mo (OOH-CARE-SITE) and the next rung is the £1,500/mo retainer. So the calculator currently tells someone with a £12k custom system that keeping it alive costs the same as a 3-page brochure site — that number reads as either a mistake or a bait. It also leaves a real product gap: most build clients need "keep it running", not "keep shipping features".

**New: a Care ladder, priced per build type** (replaces the flat add-on inside the calculator; the checkbox becomes "Care & monitoring" with the per-type price shown):

| SKU (new — Stripe gap for Phase B to flag per §3.4) | Applies to | £/mo | Includes |
|---|---|---|---|
| OOH-CARE-SITE (existing) | website | **£100** | Hosting, SSL, updates, backups, uptime, small fixes |
| OOH-CARE-AUTO (new) | automation | **£150** | Runtime hosting, monitoring + eval-drift alerts, key rotation, small fixes; model usage passed through at cost |
| OOH-CARE-APP (new) | webapp | **£300** | Infra, backups, dependency + security patching, uptime, small fixes (≤2h/mo) |
| OOH-CARE-CUSTOM (new) | custom | **£400** | As CARE-APP plus integration-endpoint monitoring |

Care ≠ retainer, and the copy must keep them distinct: **care keeps it running; the retainer (from £1,500/mo) keeps it shipping.** Retainer tiers unchanged: light £1,500 / standard £2,500 / heavy £4,000 (price book) — and the redesigned pricing page should finally publish all three with scope, since transparency is the brand promise. ASSUMED tier scopes (for Callum to confirm): light = one active workstream, weekly ship cycle; standard = 2–3 day cycles, two workstreams; heavy = multiple workstreams + on-call.

### 1c. Add-on coherence (CHANGED — visibility rules)

- "Built-in AI features +£600": **hide for `automation`** (the build *is* AI; offering it double-charges conceptually and reads as padding).
- "CMS / content editing +£400": **hide for `automation`** (no meaning).
- AI features add-on keeps £600 one-off and £0/mo, but the copy gains one honest line: *"Model usage billed at cost — typically £10–£50/month for most features."* Inference isn't free and pretending otherwise creates the first awkward invoice.
- "Auth and payments +£900": unchanged, and **visible for all four build types including automation** (an automation with Stripe access is legitimately a thing).

### 1d. Guard copy (NEW — goes with the calculator; final wording in the content package)

The calculator quotes typical scope. Above it, one line: estimates cover the ranges most projects land in; bigger or multi-system builds (automations to ~£20k, custom systems to ~£50k) are quoted on a call within 24h. This keeps the §1 table's ceilings true without the calculator pretending to reach them linearly.

### 1e. Structural

Calculator constants move from `PricingCalculator.js` into `src/data/pricing.js` (per FRONTEND_DESIGN_PROMPT §1: one source of pricing truth; the audit found them embedded in the component).

## 2. Three-point sanity walk, per service line (new numbers where changed)

| Line | Minimal | Typical | Complex | Human-offer verdict |
|---|---|---|---|---|
| Websites | 1–5 pages: £500 + £100/mo | 8p + CMS: £1,350 + £100/mo | 15p + CMS + AI: £3,000 + £100/mo | Sane at every point; £100/mo on a £500 site is the hosting-and-care recurring model, standard for local-business sites and honestly delivered (IONOS hosting is a real cost). |
| AI automations | 1 workflow: £750 + £150/mo care | 3 wf: £1,550 + £150/mo | 10 wf: £4,350 + care; beyond → call | Entry price is the wedge and it's committed everywhere. Ceiling gap vs §1's £20k handled by guard copy, not by inflating the slider. |
| Web apps / SaaS | 1-feature slice: £4,000 | 5 feat + auth + AI: £7,900 + £300/mo | 10 feat + all add-ons: £11,300 + £300/mo | Fixed by 1a. Note: marketing copy mentioning "prototypes same day" must not imply £4k prototypes — prototypes ride the automation/website price points; MVPs start at £4k. Content package words this carefully. |
| Custom software | 1 module: £3,500 | 4 mod + auth: £6,800 + £400/mo | 10 mod + all: £12,600 + £400/mo; beyond → call | Sane. Floor unified at £3,500 (supersedes §1's "£3k"). |
| Maintenance retainer | £1,500/mo | £2,500/mo | £4,000/mo | Unchanged, matches price book; publish all three tiers (1b). |
| Coaching (business) | £100/hr | 3w £1,500 | 6w £3,500 / 12w £6,500 | Consistent with price book. £100/hr is below market for senior AI engineers — deliberate wedge pricing; keep, revisit after utilisation data. The 12w at £6,500 delivering "10+ automations" undercuts buying them as projects — correct *only if* copy keeps the frame "we build it with your team, your team runs it" vs projects "we build it for you". Content package enforces that frame. |
| Coaching (dev) + courses | £100/hr; 3w £395 | 6w £795 | 12w £1,495; team training from £2,500 | All match Appendix A exactly. **Stale data, not stale pricing:** `next_cohort` dates (06-08/15/22 past; 07-06 imminent) and `seats_taken` need real values from Callum before publish — flagged in `legal_review_needed.md` companion list. |
| Lead engine | £500 + £250/mo | £1,500 + £750/mo | from £4,000 + £2,000+/mo | Matches price book. Margin watch: Starter's 1,000 leads/mo at £250 only works if source-API costs stay capped — caps already in the tier copy; keep. The "~£15 cost/meeting vs ~£150 SDR" stat is an unverified claim — **soften to "a fraction of typical SDR cost per meeting" until real cohort data exists** (CHANGED, copy-level). |
| AISEO | £0 audit | £1,500 + £500/mo | £3,500 + £1,500/mo | Matches price book; free audit is the right lead magnet; Authority's 3 articles + 5 placements/mo is deliverable AI-native. No change. |
| SaaS (LogoVault) | Free | £9 / £39 | £149 | Matches price book. "900k+ logos indexed" is a factual claim to verify before it ships in new copy (flagged). |
| AI growth (`/services/ai-growth`) | — | — | — | **Pricing hole (CHANGED, resolution):** the service page quotes no price anywhere, while `/lead-engine` productises the same capability with public tiers. Resolution: ai-growth is the bespoke, quote-led engagement (copy points at the 24h-quote path) and cross-links to `/lead-engine` tiers as the productised starting point. No third price list — one capability, two entry modes. |

## 3. Fixed-price cross-check (calculator/site vs. committed prices)

Verified matching: all 6 course prices, £100/hr coaching, team training £2,500, retainer trio, lead-engine trio, AISEO pair + free audit, LogoVault trio, website £500 + £100/mo, automation £750 floor. Contradictions found and resolved by this review: **(A)** web-app floor (calculator £2,500 vs committed £4k) → £4,000; **(B)** starter-site page count (card "up to 5 pages" vs calculator per-page-from-2) → formula fix; **(C)** custom floor stated two ways (£3k vs £3.5k) → £3,500 everywhere; **(D)** care pricing (flat £100/mo vs retainer book) → Care ladder, 4 SKUs, 3 of them new → **Phase B: check Stripe for OOH-CARE-AUTO/APP/CUSTOM; if absent, log to BLOCKERS.md per Appendix A process — do not invent price IDs.**

## 4. What Phase B must do with this file

1. Implement §1a–1e exactly; move constants to `src/data/pricing.js`.
2. The §5 gate in FRONTEND_DESIGN_PROMPT requires calculator output to match **this file** — worked examples in §2 are the acceptance numbers.
3. Flag Stripe gaps (§3D) rather than re-implementing billing.
4. Copy explaining any of these numbers comes from the content package (`docs/content/`), not from this file's prose.
