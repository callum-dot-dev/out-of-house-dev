# ADR 0003 — Styling approach for the v4 redesign

- **Status:** accepted
- **Date:** 2026-07-04
- **Context:** Phase B (`FRONTEND_DESIGN_PROMPT` §3.2, `PHASE_B_PROMPT` §B1) needs one
  styling approach for the redesign. Today: plain CSS — `apps/web/src/App.css`
  (~187 KB, the active v3 system + a full custom-property token block) plus
  `src/styles/v3.css` (~35 KB legacy) and the CRA `index.css`. No Tailwind or
  CSS-in-JS is installed.

## Decision

**Stay with plain CSS custom properties. No new framework.** Introduce a
layered `src/styles/` structure loaded ahead of the existing sheets:

1. `styles/tokens.css` — the single source of design truth (design_tokens §1–4).
   Extracted from App.css's old `:root` block, values preserved verbatim, plus
   the redesign's additive tokens (`--accent-text`, `--tint-mint/sand/sky`,
   `--focus-ring`, `--fs-small`, the `--sp-1..8` micro scale, `--font-*`).
   Imported **first** in `src/index.js` so every rule can consume it.
2. `styles/primitives.css` — the six-state primitive contract (design_tokens §5),
   added in B2.
3. `styles/motion.css` — the three sanctioned motion patterns (design_tokens §4),
   added in B7.
4. `App.css` remains the **sections + pages** layer. It is already clearly
   comment-sectioned; it consumes the token layer.

## Why not the full big-bang split (tokens/primitives/sections/pages)

The brief floats splitting the whole 187 KB monolith. Rejected as the *primary*
move: relocating thousands of rules across files is a high-risk, source-order-and-
specificity-sensitive operation whose only payoff is file topology — with 30+
pages riding on the cascade, any regression is user-visible, and the file is
already sectioned. Instead we **extract the layers that carry real value**
(tokens, primitives, motion — the reusable contracts) and leave the section/page
CSS co-located, migrating pieces out opportunistically as pages are redesigned.
This delivers the maintainability goal (one token source, reusable primitive
layer) without a risky rewrite. `v3.css` is retained as legacy debt (noted in
PROGRESS) rather than purged mid-redesign.

## Why not Tailwind / CSS-in-JS

A framework swap would be a rewrite of a working 187 KB system for zero
user-visible benefit, would fight the design mandate ("an evolution, not a
rebrand"), and adds build/runtime weight. The token system already gives us the
design-system primitives a framework would provide.

## Consequences

- One authoritative token file; the automated contrast gate (`check:contrast`,
  wired into `npm run lint` + CI) runs over it.
- New CSS goes into the layered files or the correct App.css section, never a new
  ad-hoc sheet.
- A future full split remains available; this ADR is the record of why it was
  deferred.
