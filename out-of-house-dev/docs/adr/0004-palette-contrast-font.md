# ADR 0004 — Palette rationale, contrast gate, and the font decision

- **Status:** accepted
- **Date:** 2026-07-04
- **Context:** design_tokens §1/§2/§7 define the colour system, a mandatory
  contrast gate, and a font choice (Poppins self-host vs system) left for Phase B.

## Palette rationale

Derived from the logo: **ink + paper + one spring green, used sparingly** (~90%
of any viewport is paper/ink; green only at actions, active/selected, price
figures, the logo's house, proof numbers). The v3 core tokens are kept exactly —
this is a sharpening, not a rebrand. Additions:

- `--accent-text: #177050` — `--accent` (#2bbf86) is only ~2.5:1 on paper and
  **fails AA for text**; green text/links on light surfaces use `--accent-text`
  (measured 5.8:1 on `--bg`, 6.05:1 on `--surface`). `--accent` stays for fills,
  icons, and text on dark only.
- `--tint-mint / --tint-sand / --tint-sky` — pastel section-identity tints
  (money/proof · learn · products). Surfaces only, never text.
- `--focus-ring: var(--accent-deep)` — **§7 requires ≥3:1 for focus rings, and
  plain `--accent` is only ~2.3:1 on light** (an inconsistency in the design doc,
  which named `--accent` for the ring). We resolve it accessibility-first:
  `--accent-deep` (#1f8a60, ~4.1:1 on paper) on light, `--accent-bright` on dark.

## Contrast gate (design_tokens §7)

`apps/web/scripts/check-contrast.mjs` parses `tokens.css` and asserts WCAG ratios
for 17 critical pairs (text ≥4.5, focus/large-UI ≥3). Wired into `npm run lint`
(hence the B9 gate and CI). A token edit that drops a pair below its ratio fails
the build. All 17 pairs pass at adoption.

## Font decision — ship the system stack now, Poppins queued

design_tokens §2 prefers a self-hosted Poppins display face over the system body
stack. **Decision: ship the system stack (`--font-sans`) for now.** Rationale:

- `'Geist'`/`'Geist Mono'` were referenced across App.css but **never actually
  loaded** (no `@font-face`, no font files) — so the site already renders in the
  system UI stack. Formalising that as the intended stack is a zero-regression,
  zero-layout-shift, zero-perf-cost change.
- Self-hosting Poppins requires its WOFF2 assets, which **cannot be fetched in
  this no-network build** (BLOCKERS §E). Inventing/guessing font binaries is not
  appropriate.
- `--font-display: 'Poppins', var(--font-sans)` is defined so that dropping the
  Poppins WOFF2 into `public/fonts` + one `@font-face` later flips display type
  on with no other code change. Prices already use `--font-mono` + tabular-nums.

## Consequences

- No visible font change today (system stack was already effective).
- ASSUMED: Poppins self-host is a follow-up needing the font assets — logged for
  Callum. `--font-display` is wired and ready.
