# Homepage copy — `/`

Final copy, Phase A. Section order follows `docs/design/inspiration_analysis.md` §Synthesis: one claim per section, numbered progression. Where a block says ADOPT, the existing text is the approved final version.

## 01 · Hero

**Status ticker (kept):** ADOPT `App.js#HERO_STATUS_MESSAGES` (all four lines).

**H1:**
> Software and AI automations, priced by **exactly what you need**.

(Accent span: "exactly what you need".)

**Lead (one sentence):**
> Senior engineers, AI-native delivery, fixed prices — scoped on a real call, quoted within 24 hours, and often live within days.

**CTAs:** Primary: `Book a discovery call` (cal.com link, unchanged). Secondary (text link, scrolls to calculator): `Price your build in 20 seconds ↓`

**Hero price-proof strip** (replaces the "in the workshop" panel — its items were hardcoded demo data, per the audit):

Four chips + one caption. Chips:
> Websites **from £500** · AI automations **from £750** · Web apps **from £4,000** · Custom software **from £3,500**

Caption:
> No bundles, no tiers you don't need. Pages, workflows, features — you pay for the ones you actually use.

## 02 · Proof bar

ADOPT `App.js#PROOF_POINTS` (all four), unchanged.

## 03 · Why us (compresses the current "trilemma" section — one claim, three foils, one resolution)

**Eyebrow:** The three-way fork · **H2:** Every founder hits the same fork. **We're the fourth option.** (accent: "the fourth option")

Three compact foil cards (title + one sentence each — the current four-bullet pain lists are cut for density):

1. **AI alone** — Brilliant at the typing; no judgement about your business, no accountability when it's confidently wrong.
2. **Hiring in-house** — £80k+ a year and a six-month cycle before the first feature ships.
3. **DIY** — Fine until the problem is bespoke; most founders we meet are stuck at 70% done.

**Resolution block:**
> **{out-of-house.dev} — the answer to your in-house problems.**
> Senior engineers who use AI as a multiplier, not a replacement. You skip the hiring cycle, the DIY plateau, and the hallucination tax. Working software, shipped fast, owned by you.

Resolution meta rows: ADOPT `App.js` positioning-resolution-meta (vs in-house ~85% cheaper / vs DIY 10× faster / vs AI alone human judgement — all three rows verbatim).

CTAs: `Book a 30-minute call` / `See pricing`.

## 04 · What we build (services router — replaces the accordion)

**Eyebrow:** Services · **H2:** Six ways in. **One senior team.** (accent: "One senior team")

Six router cards, each: title, one-line pitch, from-price, link. (Full descriptions live on the service pages; the router's job is one click to the right page — see inspiration analysis.)

| Card | One-liner | Price line |
|---|---|---|
| AI automations *(Flagship)* | Custom AI workflows on the tools you already run — inbox triage, document processing, copilots. | from £750 |
| Websites & landing pages | Marketing sites that go live the same day you brief us. | from £500 + £100/mo care |
| Web apps & SaaS | MVPs and full products in weeks, not quarters. | from £4,000 |
| Custom internal software | Replace the spreadsheets and the almost-right SaaS subscriptions. | from £3,500 |
| AI growth & lead engine | Pipeline that runs itself: discovery, outreach, content. | tiers from £500 + £250/mo |
| Ongoing care & retainers | We keep it running — or keep it shipping. | care from £100/mo · retainers from £1,500/mo |

Card link label (all): `See the full breakdown →`

## 05 · The discipline (capabilities)

Eyebrow, H2, lead: ADOPT `App.js` capabilities-head block verbatim ("The discipline behind AI that ships…"). Cards: ADOPT `App.js#CAPABILITIES` — all nine, verbatim.

## 06 · How it works

ADOPT the existing `HorizontalSteps` content. Design note (not copy): this is the section that gets the scroll-progress treatment per `inspiration_analysis.md`.

## 07 · Why we can promise this (benefits)

H2: ADOPT ("Built to deliver at a pace others can't match."). The three claims (same-day, you own the code, first-month refund): ADOPT `App.js` benefits-statement verbatim. Side list: ADOPT, one edit — replace "Transparent fixed pricing. No hourly surprises." with:
> Fixed prices, published starting points, no hourly surprises.

## 08 · Pricing

Eyebrow: Pricing · **H2:** ADOPT ("Honest prices for the 2026 way of building.")

Trust strip: ADOPT (all three checks).

**Three cards — updated details (numbers per `pricing_review.md`):**

**Starter site — £500** + £100/month hosting and care
> For local businesses and solo founders. A real website, live the same day.
- Up to 5 pages, mobile-perfect *(then £150/page — same maths as the calculator)*
- SEO, analytics, contact form
- Hosted by us on IONOS — you never think about it
- Same-day or next-day go-live
- Monthly care: updates, fixes, backups
- Cancel hosting anytime; you keep the site
CTA: `Book a call`

**Custom build — from £750** *(Most popular)*
> AI automation, MVP, web app, or internal tool. Scoped on a call, fixed price within 24 hours.
- AI automations from £750 · web apps from £4,000 · internal software from £3,500
- Often delivered same-week
- Integration with your tools and APIs
- You own the code and infrastructure
- Acceptance criteria signed off before completion
- 30 days of post-launch fixes included
CTA: `Scope a project`

**Monthly engagement — from £1,500/month**
> A senior team on tap. Light £1,500 · Standard £2,500 · Heavy £4,000 — pause anytime.
- Dedicated senior engineer + delivery lead
- Continuous shipping, typically 2–3 day cycles
- Direct Slack access to the team
- Features, automations, maintenance, iteration
- Pause or cancel anytime; first-month money-back guarantee
CTA: `Start an engagement`

**Invoice-nevers callout:** ADOPT `App.js` invoice-callout verbatim (list + "Why is everything so reasonable?" foot).

## 09 · Calculator

Eyebrow: Estimate · **H2:** ADOPT ("Build your rough quote in 20 seconds.")

**Guard line (NEW — sits directly above the calculator, per pricing_review §1d):**
> These estimates cover the scopes most projects land in. Bigger builds — complex automations up to ~£20k, custom systems up to ~£50k — get a fixed quote on a call, within 24 hours.

**Microcopy changes inside the calculator:**
- "Hosting and maintenance" add-on → **"Care & monitoring"**, detail: `We host it, patch it, watch it, and fix the small stuff` — price shown per build type (£100/£150/£300/£400 per pricing_review §1b).
- AI features add-on detail gains: `Model usage billed at cost — typically £10–£50/month.`
- Result footer: ADOPT ("Final quote confirmed within 24 hours of a call.").
- CTAs: ADOPT (`Lock in this quote` / `Apply with this scope`).

## 10 · FAQ

ADOPT `App.js#FAQ` — all eight Q&As verbatim, with **one substitution** in "Can you actually generate leads…": replace the final sentence with:
> The result is a small team's worth of SDR output without the headcount — booked meetings on your calendar, at a fraction of the usual cost per meeting.

(Reason: removes the unverified "~£15 vs £150" implication carried elsewhere; see pricing_review §2.)

## 11 · Contact + footer

ADOPT the existing contact section (email, phone, location, company links) and footer legal strip verbatim. One addition to the footer strip: a `Trust & security` link alongside Terms/Privacy/Sub-processors (it's currently only in the contact block).
