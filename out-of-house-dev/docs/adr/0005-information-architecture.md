# ADR 0005 — Information architecture / navigation

- **Status:** accepted
- **Date:** 2026-07-04
- **Context:** `FRONTEND_DESIGN_PROMPT` §3.1 + `PHASE_B_PROMPT` §B3 ask for a
  simplified IA. `inspiration_analysis.md` (Fauna analysis) sets the concrete
  target: **five top-level nav items maximum**. Audit §3 found the current nav
  spans 3 dropdowns + 2 section-scroll links + a standalone Developers link +
  auth — well above what a first-time visitor needs, with Developers/Showcase/
  Changelog/Trust scattered (some only reachable from the footer).

## Decision — five top-level items

**Build · Learn · Products · Pricing · Company** (+ utility: Sign in / Open app,
and the Book-a-call CTA, which are not counted as nav sections).

### Before → after

```
BEFORE (8 top-level slots)                AFTER (5 + utility)
  Home                          ─drop→    (logo is home)
  Services ▾ (6 lines)          ─rename→  Build ▾ (6 service lines)
  Learn ▾ (2 tracks + courses)  ─keep→    Learn ▾ (2 tracks + courses)
  Products ▾ (saas+lead+aiseo)  ─keep→    Products ▾ (saas + Lead Engine + AISEO)
  Why us  (→ #benefits)         ─drop→    (homepage section, reached by scroll)
  Pricing (→ #pricing)          ─keep→    Pricing (→ #pricing)
  Developers                    ─move→    Company ▾  ┐ For developers
  (footer only) Showcase        ─move→               ├ Showcase
  (footer only) Changelog       ─move→               ├ Changelog
  (contact only) Trust          ─move→               └ Trust & security
  Sign in / Open app            ─keep→    Sign in / Open app (utility)
  Contact Us CTA                ─keep→    Contact Us CTA (utility)
```

### Rationale

- **Drop "Home":** the logo is the universal home affordance; a separate item is
  redundant.
- **Drop "Why us":** it scrolled to a homepage section, not a destination — it
  belongs in the page flow, not the global nav. Still reachable by scrolling.
- **"Services" → "Build":** matches the brand framing ("what we build"), pairs
  cleanly with "Learn", and is the label the inspiration synthesis chose.
- **New "Company" dropdown:** gives Developers / Showcase / Changelog / Trust a
  single obvious home instead of being scattered across footer/contact. This is
  the audit's "consolidate Showcase/Changelog + give Developers a home" call.
- One obvious path per §1: **what do you need (Build) → what does it cost
  (Pricing / price anchors on each Build page) → start** — detail lives on the
  pages, not the menu.

## Routes / redirects

**No route paths change** — the nav only regroups links to existing routes, so
no redirects are required. Every route in audit §3 is preserved (verified against
`App.js`); the `*` catch-all still redirects unknown paths to `/`. The four
Company links (`/developers`, `/showcase`, `/changelog`, `/trust`) and all Build/
Learn/Products links resolve to existing routes.

## Implementation

`Header.js` refactored to a single reusable `NavDropdown` (one accessible
implementation for all four menus: `aria-haspopup`, `aria-expanded`, roving
outside-click/Esc close, mobile-drawer aware) instead of three hand-duplicated
blocks. `openMenu` is a single string state (`build|learn|products|company|null`)
replacing four booleans.

## Consequences

- The footer legal strip gains a `Trust & security` link (home.md §11) so Trust
  is reachable from both Company and the footer.
- Mobile drawer inherits the same five items.
