# Service pages — build lines

Covers `/services/ai-automations`, `/services/websites`, `/services/web-apps`, `/services/internal-tools`. The existing `data/services.js` records passed the audit with only price-anchor and consistency fixes needed — everything not listed as CHANGED below is **ADOPT verbatim from the corresponding `services.js` field** (hero, offer, process, deliverables, cta).

Every service page additionally gets a shared **price anchor block** rendered under the hero (component, one per page; copy below per service). This is the "transparent pricing next to the service" requirement from §1.

## `/services/ai-automations` (ADOPT all fields, plus:)

**Price anchor:**
> **From £750** fixed, per scoped automation · typical multi-workflow builds £1,550–£4,350 · complex, multi-system scopes quoted to ~£20k · optional care & monitoring £150/month (model usage at cost).
> `Price your automation ↓` → calculator, automation preset · `Book a scoping call` → cal.com

**One copy edit:** accordion (`services.js#accordion`) final sentence stays; append nothing. No other changes — this page's copy is the reference standard for the others.

## `/services/websites` (ADOPT all fields, plus:)

**Price anchor:**
> **£500** for a starter site — up to 5 pages, live same day · +£150/page beyond 5 · **£100/month** hosting and care (updates, backups, uptime) · cancel anytime, the site stays yours.
> `Price your site ↓` · `Brief us today`

**Consistency note for Phase B:** the offer item "Starter sites (1–5 pages)" already matches the corrected calculator maths (pricing_review §1a) — no text change needed, just don't break it.

## `/services/web-apps` (ADOPT offer, process, deliverables, cta; hero CHANGED:)

**Hero lead (CHANGED — adds the committed floor and separates prototypes from MVPs, per pricing_review §2):**
> Full web application and SaaS builds: auth, billing, multi-tenant, AI features baked in where they matter. **MVPs from £4,000**, shipped in weeks instead of quarters, at a quality level that holds up to real users. Need something rougher first? Same-day prototypes ride our website and automation price points (from £500) — ask on the call.

**Hero proofPoints (CHANGED, first item only):** `{ kicker: 'MVPs', value: 'from £4,000' }` (was "in 2–4 weeks" — the timeline lives in the lead now; the price is the scarcer information).

**Price anchor:**
> **From £4,000** for an MVP · typical 5-feature build with auth and an AI feature ≈ £7,900 · care & monitoring £300/month · larger products quoted fixed, within 24 hours of a call.
> `Price your build ↓` · `Scope a product`

## `/services/internal-tools` (ADOPT all fields, plus:)

**Price anchor:**
> **From £3,500** fixed · typical 4-module tool with accounts ≈ £6,800 · care & monitoring £400/month · systems beyond ~10 modules quoted to ~£50k.
> `Price your tool ↓` · `Audit your workflow`
