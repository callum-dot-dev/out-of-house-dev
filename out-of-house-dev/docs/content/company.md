# Company pages + auth microcopy

Covers `/developers`, `/showcase`, `/changelog`, `/apply`, `/login`, `/password-reset`, 404 handling.

## `/developers`

ADOPT the whole page as written in `Developers.js` — hero ("Real paid work, while you prove what you can do."), both pillar lists, all four programme steps, closing CTA. The audit found this page already on-voice and §0.D-clean. One addition, a line under the closing CTA:

> We pay for trial tasks because your time is worth money before we've decided anything.

## `/showcase`

ADOPT the page frame (`pages/Showcase.js`): H1 "What we've shipped.", lead "A live list of projects clients have opted into showing."

**Empty state (CHANGED — current one is fine but soft):**
> Client work goes up here only with written permission, and most of ours is internal tooling their competitors would love to see. Want a reference anyway? Book a call — we'll show you relevant work privately.

## `/changelog`

**H1:** What shipped. · **Lead:** `Public build notes from projects that opted in. Newest first.`
**Empty state:** `Nothing public yet — check the showcase, or ask us directly.`

## Auth pages (microcopy only; flows unchanged per §0.E)

**/apply** — H1: `Tell us what you're building.` Lead: `Five fields, one business day to a reply. If a call is faster, book one instead.` (Keep the calculator handoff params rendering as a scope summary if present: "Your calculator estimate: {type}, {units} — £{oneoff}{ + £monthly/mo}. We'll confirm it on the call.") Submit: `Send application` · Success: `Got it. A real person replies within one business day.`
**/login** — H1: `Welcome back.` Magic-link helper: `We'll email you a sign-in link — no password needed.` Error (generic, no account enumeration): `That didn't work. Check the address, or try the magic link.`
**/password-reset** — H1: `Reset your password.` Success: `If that address has an account, a reset link is on its way.`

## `/auth/callback`

Transient state only — no page copy beyond: `Signing you in…` and, on failure: `That link didn't work — it may have expired. Request a fresh one from the login page.` → `Back to login`

## 404 / unknown routes

Current behaviour redirects to `/` silently. Keep the redirect but Phase B may add a brief toast: `That page doesn't exist — here's home instead.` (Optional; not a blocker.)
