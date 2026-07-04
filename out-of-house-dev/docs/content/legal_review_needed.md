# Legal review + open facts — blocking list before publish

Author: Fable 5 (Phase A, §3.6). Two lists: (1) what a solicitor must review — drafting by an AI is not a substitute for legal advice, especially for UK data-protection and consumer-contract obligations; (2) business facts only Callum can supply. **Nothing in `docs/content/legal-*.md` ships with either list unresolved.**

## 1. Solicitor review scope

- **Terms — courses & coaching section (entirely new):** Consumer Contracts Regulations 2013 cooling-off wording for cohort courses bought by individuals (14-day right, early-performance consent, proportionate deduction); whether the free cohort-transfer and reschedule terms create unintended obligations; certificate revocation clause.
- **Terms — liability cap** (12-month fees) and refund discretion wording: standard-looking, but confirm enforceability against consumers vs. businesses (different unfairness tests).
- **Terms — SaaS section:** 30-day price-change notice; fair-use restrictions; whether logo-asset redistribution language (LogoVault) adequately addresses third-party trademark exposure.
- **Privacy — new "AI processing" section:** confirm the description of Anthropic/OpenAI business terms is accurate and that controller/processor roles are correctly assigned; retention schedule (esp. indefinite certificate retention); international-transfer basis for AI providers.
- **Sub-processors:** confirm DPAs / equivalent terms actually exist with each listed vendor; 14-day advance-notice commitment is operationally realistic.
- **General:** whether out-of-house.dev needs to display a registered company number/address on the site (Companies Act requirements depend on entity type).

## 2. Facts Callum must supply (all `[TODO:callum:]` markers, consolidated)

| Fact | Used in | Note |
|---|---|---|
| Legal entity name + registered/trading address | Terms, Privacy | Currently "available on request" |
| ICO registration number | Privacy, Trust | Trust page currently says "on request" |
| VAT registration status | Terms | Copy must match reality |
| Effective dates for all legal pages | All four | Set at publish |
| Cyber Essentials status | Trust | "In progress" since May — still true? |
| status.out-of-house.dev exists? | Trust | Currently linked, unverified |
| Real next-cohort dates + seat counts (6 courses) | learn.md / programmes.js | Several dates already past |
| LogoVault "900k+ logos indexed" | products.md | Verify or drop |
| Retainer tier scope definitions | pricing_review §1b, services-growth-care.md | ASSUMED values need sign-off |

## 3. Publish-order dependency (from the audit)

Privacy, Sub-processors, and Trust describe the Render architecture. **They publish with the Render cutover, not before.** The current live Trust page already over-claims Render hosting — that's an existing accuracy issue the cutover resolves; if cutover is deferred, use the fallback lines in `legal-trust.md` and hold the other two pages.
