# Inspiration analysis — what we borrow, and why it serves the goal

Date: 2026-07-04 · Author: Fable 5 (Phase A, §2 of FRONTEND_DESIGN_PROMPT) · Companion: `design_tokens.md`

The goal every borrow is tested against (§1): *a first-time visitor understands "pay only for what you use, priced by what you actually need" from the hero alone, then reaches their service → transparent price → start a request with less friction than today.* Anything that doesn't serve that is noted and deliberately not borrowed.

Method note: each site was analysed from its live structure and content on 2026-07-04. Claims about exact palettes are kept qualitative; Phase B should not clone any pixel values from these sites regardless.

## 1. wisprflow.ai

**What they actually do in the hero:** four words ("Don't type, just speak"), a one-sentence subhead, one CTA — and then the entire value proposition is carried by a single *artifact*: a messy-speech paragraph next to its polished output. Nobody reads a feature list; the before/after does the persuading. Below the fold, each scroll section makes exactly one claim ("4× faster than typing", "Write faster in all your apps") backed by exactly one visual proof, then a persona router ("Made for the way *you* work") sends each visitor down their own path.

**Borrow:**
- **The proof-artifact hero.** Our equivalent of their before/after is the pricing calculator: a compact, interactive "what would this cost me" element *in or immediately beside the hero* communicates "priced by what you actually need" without a paragraph of copy. This is the single most direct answer to the §1 design problem, and we already own the component — it moves up the page rather than being built new.
- **One claim per scroll section.** The current homepage has 10 sections, several making 3+ claims each (positioning cards carry title + body + 4 pains). Discipline: every section gets one claim, one proof.
- **The persona/service router.** Their audience tabs map cleanly onto our six service lines: a single "What do you need built?" router beats a 6-item accordion for getting a visitor to their service page in one click.

**Do not borrow:** their navigation. The fetch shows 6 top-level groups fanning out to 40+ destinations — the exact overload §3.1 tells us to cut. Also their volume of logo-wall repetition; we have no comparable logo bank and shouldn't fake one.

## 2. sui.io

**What they actually do:** the page opens with a scroll-progress indicator and treats scrolling itself as the interaction — numbered stack modules (01–06) assemble as you move, motion is tied to progression through an argument rather than decoration. It feels like a designed product because *state responds to the visitor*, not because of heavy 3D. (They do ship heavy media; the feel survives without it.)

**Borrow:**
- **Numbered-progression grammar.** The codebase already numbers things (`capability-num`, positioning `01–04`, process steps). Elevate this into a consistent system: services, process, and pricing steps all use the same numbered-module component, so the whole site reads as one continuous "how we get you to shipped" sequence. Cheap, distinctive, on-brand for an engineering studio.
- **Selective scroll-driven state.** Keep and refine what `App.js` already has (IntersectionObserver fade-ins, cursor spotlight on cards) rather than adding a scroll library. One new purposeful use: the process section ("brief → scope → build → live") advances a progress marker as you scroll it — motion that *explains the offer* (speed, staged delivery).
- **Performance ceiling as a rule.** No WebGL, no scroll-jacking, no video backgrounds. Everything motion-related must be CSS transform/opacity driven, respect `prefers-reduced-motion` (§0.E), and the Lighthouse performance gate in §5 is the hard budget. Sui earns "site as product" through responsiveness, not weight — that's the transferable part.

**Do not borrow:** their IA depth (the fetched nav shows the same links repeated across four contexts), form-heavy footers, or token-economy gravitas. We're a friendly UK studio, not an L1 chain.

## 3. faunarobotics.com

**What they actually do:** a soft, playful surface over a deeply technical product, and it never reads childish. The mechanisms visible in the structure: a five-item top nav (Home / Product / Company / Careers / News — that's it); a hero of three adjectives + audience ("Capable, safe, fun. Robots for everyone."); an audience triptych (developers / enterprises / researchers) that segments without splitting the site; short declarative sentences throughout; generous whitespace doing the "premium" work so the palette can afford to be soft.

**Borrow:**
- **Nav minimalism as a number.** Five top-level items maximum. This is the concrete target for §3.1's IA proposal (current state: 3 dropdowns spanning 14+ destinations, plus Developers, plus auth).
- **The playful-premium balance recipe:** soft colour + disciplined type + lots of air + short confident sentences. Our logo already gives us the ingredients (near-black ink, spring-green accent, geometric letterforms — see `design_tokens.md`); Fauna proves the register works for a technical brand.
- **Audience triptych.** "For founders / for teams / for developers" as one section on the homepage, replacing part of the positioning-trilemma sprawl — it segments visitors *toward* their service and price rather than making them read three negative cards before the pitch.

**Do not borrow:** video-first storytelling (we have no film budget and don't need one — our proof artifact is the calculator and shipped work), or their sparse-copy extreme on service pages; ours must carry transparent pricing detail.

## Synthesis — the system these three point at (and which is ours, not theirs)

1. **Hero = claim + interactive price proof.** Headline states the positioning in one line; the calculator (or a 3-control teaser of it) sits beside it. Wisprflow's lesson, our artifact. Nobody in the reference set does *pricing* in the hero — that's our differentiator and defensibly original.
2. **One page, one argument, numbered.** Sui's progression grammar carries the visitor: 01 what we build → 02 what it costs → 03 how fast → 04 start. Every marketing page follows the same numbered skeleton.
3. **Soft-but-serious surface.** Fauna's balance, executed with our own palette (paper + ink + spring green, defined in `design_tokens.md`) — pastel-adjacent tints for surfaces, ink for authority, green strictly for action and proof moments.
4. **Five nav items.** Build (services) · Learn (coaching + courses) · Products · Pricing · Company — one obvious path per §1, detail lives on the pages, not the menu. (Final IA is Phase B's §3.1 call; this is the design-side input.)
