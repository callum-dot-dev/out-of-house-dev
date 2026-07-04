# Content package — how Phase B consumes this directory

Author: Fable 5 (Phase A, §3.6 of FRONTEND_DESIGN_PROMPT). Per §0.F, Phase B (Opus 4.8) implements this content **verbatim** — structural/markup adaptation is fine; rewording, inventing, or "improving" is not. If a page or component needs copy that isn't here, that's a blocker → `docs/prompts/BLOCKERS.md`, then move on. Do not write placeholder marketing or legal copy.

## Conventions

- **ADOPT `<file>#<field>`** — the existing text in that data file/component field is the approved final copy; keep it verbatim (it was audited and passed). This avoids transcription drift for copy that already meets the bar.
- **`[TODO:callum:…]`** — a business fact only Callum can supply (dates, registration numbers). These MUST be resolved before publish; each one is also listed in `legal_review_needed.md`. Ship nothing containing an unresolved TODO.
- Prices in copy are the post-review numbers from `pricing_review.md`. If copy and that file ever disagree, `pricing_review.md` wins and the discrepancy gets logged.
- UK English throughout. Sentence case for headings. "AI automations" not "AI-automations". The brand mark is `{out-of-house.dev}` with braces when displayed as a wordmark.

## File map

| File | Covers |
|---|---|
| `home.md` | `/` — every section |
| `services-build.md` | `/services/ai-automations`, `/services/websites`, `/services/web-apps`, `/services/internal-tools` |
| `services-growth-care.md` | `/services/ai-growth`, `/services/maintenance` |
| `learn.md` | `/coaching`, `/coaching/:track`, `/courses`, `/courses/:slug`, `/verify/:code` |
| `products.md` | `/saas`, `/saas/logovault`, `/lead-engine`, `/aiseo` |
| `company.md` | `/developers`, `/showcase`, `/changelog`, auth pages microcopy, 404 |
| `legal-terms.md`, `legal-privacy.md`, `legal-subprocessors.md`, `legal-trust.md` | The four legal/trust pages, full text |
| `app-status.md` | Authed-app statuses, empty states, notification templates (§0.D applies) |
| `pricing_review.md` | Numbers + calculator logic (companion, not page copy) |
| `legal_review_needed.md` | Solicitor-review scope + every open `[TODO:callum:]` |
