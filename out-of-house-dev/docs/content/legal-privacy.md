# Privacy policy — `/privacy-policy` (full text)

⚠️ Solicitor review required before publish — see `legal_review_needed.md`. The existing (18 May 2026) policy is largely sound; this revision keeps its structure, corrects the hosting-timing issue (the current text implies Render is live), and adds course/learner data.

**Publish-gating rule:** this page and `/subprocessors` describe the Render architecture. They go live **with** the Render cutover (audit §2), not before. If Phase B defers the cutover, it must also hold these two pages and log the dependency in BLOCKERS.md.

---

**Eyebrow:** Privacy policy
**H1:** How we look after your data.
**Lead:** Effective from `[TODO:callum: set date at publish]`. Plain-English summary first, then the detail.

## The short version

- We only collect what you give us (apply form, account, project work, course enrolment) plus minimal analytics.
- We never sell your data.
- Email privacy@out-of-house.dev to access, correct, export, or delete your data — we respond within 30 days.
- A short, audited list of sub-processors handles specific jobs (hosting, payments, email, AI, scheduling). Full list, with what each one sees, on the [sub-processors page](/subprocessors).

## Who we are

out-of-house.dev is a UK software studio. Under UK GDPR we're the **controller** for personal data submitted through this site, and a **processor** for client data we handle during delivery. ICO registration: `[TODO:callum: registration number]`.

## What we collect

- **Apply form:** name, email, company, phone (optional), project description, budget, timeline.
- **Account:** email, name, company, role, login events.
- **Project data:** requests, comments, attachments, uploads, voice memos.
- **Course data:** enrolment details, cohort, submissions, assessment results, certificates issued.
- **Technical:** IP (spam protection), user agent, UTM parameters.
- **Cookies:** a strictly-necessary session cookie for auth; analytics cookies only if you accept them via the banner.

## Lawful bases

**Contract** — your account, projects, and course delivery. **Legitimate interest** — apply-form spam detection, security logs, product improvement. **Consent** — analytics cookies and marketing email; withdraw any time.

## AI processing *(new, honest and §0.D-safe)*

We use AI models (Anthropic's Claude; OpenAI as fallback) as tooling in scoping, drafting, and delivery. Client project data sent to these providers is sent under their business terms, which exclude training on your data. We don't use your data to train models of our own.

## Retention

Rejected applications: 6 months. Active engagements: life of the engagement. Closed projects: archived up to 6 years (UK tax records), then deleted. Auth events: 90 days. Certificates: retained indefinitely so verification keeps working (name + course + date only).

## Your rights

Access, correction, export, deletion, restriction, objection — email privacy@out-of-house.dev from your account address; response within 30 days. Complaints: the ICO at ico.org.uk.

## International transfers

Where processing leaves the UK (e.g. Stripe, AI providers), we rely on UK adequacy or the UK International Data Transfer Addendum.

## Security

TLS 1.2+ in transit, AES-256 at rest, role-scoped access with audit logging, MFA on admin accounts, least-privilege for staff. Detail on the [trust page](/trust).

## Updates

Date at the top changes when this page does; material changes are emailed to logged-in users.

## Contact

privacy@out-of-house.dev. Trading address: `[TODO:callum: address, or keep the "available on request" pattern deliberately]`.
