# Trust & security — `/trust` (full text)

⚠️ The current live page claims Render/EU hosting **before it's true** (audit §2: production is GitHub Pages today). This version is written for publish **after** the Render cutover. If Phase B defers the cutover, use the flagged fallback lines and log the dependency.

---

**Eyebrow:** Trust and security
**H1:** How we look after your data.
**Lead:** We're a UK business. We follow UK GDPR and PECR, we're registered with the ICO, and we publish exactly which sub-processors touch your data. If procurement needs something that isn't on this page, ask — we'll send it.

## Hosting and architecture

- Production app, API, workers, and database run on Render in EU regions, with API-layer authorisation scoping every resource.
  *(Fallback if cutover deferred: "Client platform services run on Render in EU regions; the marketing site is currently served via GitHub Pages during our hosting transition.")*
- The marketing site is served as a static site over HTTPS with HSTS.
- Backups: nightly logical dumps plus point-in-time recovery on the production database.

## Encryption

- In transit: TLS 1.2+, HSTS enforced.
- At rest: AES-256 on database and persistent disks.
- Secrets live in environment variables on the host — never in code, never in the browser bundle.

## Access

- Admin actions are role-gated; the in-platform audit log records who did what, when.
- Sign-in: magic link and Google OAuth, with email+password fallback. MFA available for admin accounts.
- Service credentials exist only server-side, never in the shipped app.

## AI and your data

We use Claude (Anthropic) and, as fallback, OpenAI models as delivery tooling, under business terms that exclude training on your data. Client work is isolated per project — one client's data is never used in another client's delivery.

## Compliance and posture

- UK GDPR. ICO registration `[TODO:callum: number — "details on request" is currently on the page but a number reads stronger]`.
- Cyber Essentials: `[TODO:callum: confirm current status — page says "in progress" since May]`.
- Annual external review of dependencies and access policies.

## Reporting an issue

security@out-of-house.dev — response within one business day. We never penalise good-faith research.

## More

Sub-processor list · Privacy policy · Terms · Status page (`[TODO:callum: confirm status.out-of-house.dev actually exists before we link it — the current page links it unverified]`).
