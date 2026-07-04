// Feature flags for content that is gated on a business/legal event.

// Legal publish gate (PHASE_B §B6). The four new legal texts in
// docs/content/legal-*.md are drafted and wired behind this flag, but they:
//   (a) describe the Render architecture and must publish WITH the Render
//       cutover, not before (audit §2), and
//   (b) still carry unresolved [TODO:callum:] facts + require solicitor review
//       (legal_review_needed.md) — and nothing ships with an unresolved TODO.
// So the pages keep serving the CURRENT (18 May) content until Callum resolves
// the facts + solicitor sign-off + cutover approval. Flipping this to `true`
// is the single-commit publish. The one exception already shipped is the
// Trust-page hosting fallback line (an existing accuracy fix). See BLOCKERS B/C.
export const PUBLISH_NEW_LEGAL = false;
