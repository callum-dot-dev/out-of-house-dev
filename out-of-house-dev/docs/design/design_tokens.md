# Design tokens — proposal (Phase A)

Date: 2026-07-04 · Author: Fable 5 · Status: proposed, for Phase B to implement (styling approach = Phase B ADR; these tokens are approach-agnostic CSS custom properties). Companion: `inspiration_analysis.md`.

## 0. Anchor: the logo

`apps/web/src/images/out-of-house-logo.png`: a thin geometric sans wordmark `{out-of-house.dev}` in near-black, with a house outline drawn in a bright spring green. Two colours, lots of air, curly-brace framing. Everything below is derived from it: **ink + paper + one green, used sparingly**. The current `App.css` token block already implements most of this well — this proposal *keeps* the existing base and tightens it rather than replacing it (v3 → v4 is an evolution; visitors shouldn't feel a rebrand, just a sharpening).

## 1. Colour

### Core (kept from current App.css — verified in code)

```css
--bg:            #fbfaf8;  /* warm paper — page background */
--bg-soft:       #f4f3ef;  /* section alternation */
--surface:       #ffffff;  /* cards, inputs */
--ink:           #11140f;  /* primary text; matches logo wordmark */
--ink-soft:      #292a25;
--muted:         #6b6b66;  /* secondary text — AA on --bg for normal text */
--border:        rgba(20, 20, 15, 0.10);
--border-strong: rgba(20, 20, 15, 0.18);
--accent:        #2bbf86;  /* spring green — logo-derived */
--accent-bright: #58cf98;
--accent-deep:   #1f8a60;
--accent-soft:   rgba(43, 191, 134, 0.10);
--accent-glow:   rgba(43, 191, 134, 0.18);
--dark:          #121413;  /* inverted sections + authed shell chrome */
--dark-soft:     #1d201d;
--dark-ink:      #f4f3ef;
```

### Additions (new)

```css
/* Pastel support tints — surfaces only, never text (wisprflow lesson:
   pastel applied to surfaces/CTAs with purpose, not everywhere) */
--tint-mint:  #e6f6ef;  /* pricing/proof surfaces — "money & proof" moments */
--tint-sand:  #f6efe2;  /* learn/coaching surfaces — human, warm */
--tint-sky:   #e8f0f7;  /* products/platform surfaces — calm, technical */

/* Accessible accent for text. --accent (#2bbf86) is ~2.5:1 on --bg —
   FAILS AA for text at any size we use. Rule: #2bbf86 is for fills,
   borders, icons ≥3:1 (large UI), and text on --dark only. For green
   text/links on light surfaces use: */
--accent-text: #177050;  /* ≥4.5:1 on --bg and --surface. Phase B MUST
                            re-verify with a contrast checker in CI and
                            adjust darker if measurement disagrees. */
```

Semantic states: keep existing `--success/--warning/--danger/--info` (+ `-soft` pairs). Same text rule applies: the `-soft` tints are backgrounds; text on them uses the deep variants or ink.

### Usage ratios (what keeps it premium, per Fauna analysis)

Paper/ink carry ~90% of any viewport. Green appears only at: primary actions, active/selected states, price figures, the logo's house, and proof numbers. Tints mark section identity (one tint per product area, consistently). If a screen has more than three green elements visible, it's over budget.

## 2. Typography

Current stack is system sans via CRA defaults with fluid sizes in App.css. Proposal:

- **Display/headings:** a geometric sans matching the logo's letterforms — first choice **Poppins** (Light 300 for display to echo the thin wordmark, Medium 500 for section titles), self-hosted WOFF2, `font-display: swap`. Second choice if Poppins feels too rounded in situ: Outfit. One family only; weight does the hierarchy work.
- **Body/UI:** keep the system stack (`-apple-system, Segoe UI, Roboto, …`) — free performance, and the contrast between a characterful display face and neutral body text is the wisprflow/Fauna pattern.
- **Code/numbers:** `ui-monospace, 'Cascadia Code', 'JetBrains Mono', monospace` for prices in the calculator and anything terminal-flavoured (the `{brand-bracket}` motif) — tabular numerals (`font-variant-numeric: tabular-nums`) on all price displays.

Scale (keep the existing fluid approach, formalised):

```css
--fs-display: clamp(2.6rem, 6vw, 4.6rem);   /* hero H1 — REPLACES the current
                                               clamp(4rem,14vw,14rem), which is a
                                               poster, not a heading; it forces
                                               copy-volume down but crowds mobile */
--fs-h2:      clamp(1.8rem, 3.2vw, 2.6rem);
--fs-h3:      clamp(1.2rem, 1.8vw, 1.45rem);
--fs-lead:    clamp(1.05rem, 1.6vw, 1.25rem);
--fs-body:    1rem;
--fs-small:   0.875rem;
--fs-eyebrow: 0.8rem;   /* uppercase, +0.08em tracking, --muted or --accent-text */
line-heights: display 1.05 · headings 1.15 · body 1.6
```

## 3. Spacing & layout

Keep: `--container: 1180px`, `--container-x: clamp(20px, 5vw, 56px)`, `--space-section: clamp(72px, 9vw, 140px)`, `--space-stack: clamp(28px, 4vw, 56px)`. Add an 8-pt micro scale for components: `--sp-1..8 = 4/8/12/16/24/32/48/64px`. Radii kept: 8/14/22/pill. One addition: `--radius-brace: 4px 14px 14px 14px` is **not** adopted — resist novelty radii; the brace motif lives in typography (the `{…}` marks), not geometry.

## 4. Motion

Keep existing duration/easing tokens (80/140/220/320/600ms; `--ease-out: cubic-bezier(0.22,1,0.36,1)`). Principles (sui lesson, performance-bounded):

1. Motion explains progression or state; never decoration. The three sanctioned patterns: (a) section fade-up on first reveal (existing), (b) numbered-step progress marker in process sections, (c) micro-feedback on interactive elements ≤140ms.
2. Transform/opacity only. No layout-property animation, no scroll-jacking, no parallax, no WebGL.
3. `prefers-reduced-motion: reduce` ⇒ all three patterns collapse to instant opacity (the existing App.js guards already do this for the spotlight; extend site-wide) (§0.E).
4. The cursor-spotlight card effect is kept (it's distinctive and cheap) but gated to `(hover: hover) and (pointer: fine)` — already true in code.

## 5. Component states (system-wide contract)

Every interactive primitive ships all six states; Phase B builds these into the base classes, not per-component:

| State | Treatment |
|---|---|
| Default | `--surface` on light / `--dark-soft` on dark; `--border` |
| Hover | border → `--border-strong`; translateY(-1px); 140ms |
| Focus-visible | 2px outline `--accent` + 2px offset — **always visible, never `outline: none` without replacement** (§0.E) |
| Active | translateY(0); `--accent-soft` wash |
| Disabled | 45% opacity, `cursor: not-allowed`, aria-disabled |
| Loading | existing Skeleton components; buttons keep width, swap label for spinner |

Primary button: `--ink` background, paper text (not green fill — green fails contrast with white text at 4.5:1; green is the *focus ring and icon* colour). Secondary: transparent, `--border-strong`, ink text. Tertiary/link: `--accent-text` underlined on hover.
Badges/status: `-soft` background + deep-variant text, pill radius — covers request statuses (submitted/scoped/building/review/shipped/rejected) and project statuses (discovery/building/live/paused/completed).
Empty states: icon in `--muted`, one sentence, one action. No illustrations marketplace-style.

## 6. Dark sections & authed shell

Marketing pages: paper by default; at most two `--dark` bands per page (hero-adjacent proof + pre-footer CTA). Authed app (`/app/*`): stays on the light system for content with the `--dark` sidebar/chrome; the app is a tool, legibility beats theatre. All the above tokens apply unchanged so the app inherits the redesign for free.

## 7. Accessibility gate (restating §0.E as token rules)

- Text contrast: ≥4.5:1 normal, ≥3:1 large — pre-checked pairs listed above; Phase B adds an automated contrast check over the token file to CI.
- Non-text UI contrast (borders of inputs, focus rings, icons-as-controls): ≥3:1.
- `--accent` never carries body-size text on light surfaces (use `--accent-text`).
- Focus-visible mandatory on every interactive element; test by tabbing every page in §3's route table.
- Reduced-motion collapses per §4.
