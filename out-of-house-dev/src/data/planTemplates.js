// =============================================================
// Universal plan-of-action templates per project type.
// Used to seed the plan_templates table and to spawn project_plans.
// Each template is intentionally structured for Claude Code handoff.
//
// Authored as CommonJS so both webpack (React app) and Node (seed script)
// can require it without transpile.
// =============================================================

const PLAN_TEMPLATES = [
  {
    type: 'website',
    name: 'Marketing site — same-day delivery',
    summary: 'Single-day landing site or small marketing site. Discovery to live in under 24 hours.',
    phases: [
      {
        name: 'Discovery',
        goal: 'Capture brand, audience, IA, and copy direction in 30 minutes.',
        duration: '30 min',
        steps: [
          { title: 'Brand & audience',         detail: 'Tone, anti-references, audience profile, conversion goal.',  deliverable: 'One-page brief' },
          { title: 'Information architecture', detail: 'Page list, section order, primary CTA, secondary CTAs.',     deliverable: 'IA outline' },
          { title: 'Copy direction',           detail: 'Hero, value props, social proof, CTA copy in voice.',        deliverable: 'Draft copy block' },
        ],
      },
      {
        name: 'Design',
        goal: 'Lock visual direction. Tokens, type, hero treatment.',
        duration: '1 hr',
        steps: [
          { title: 'Color & type tokens',  detail: 'OKLCH palette, font pairing, scale.',  deliverable: 'tokens.css' },
          { title: 'Hero direction',       detail: 'Two distinct hero options, pick one.', deliverable: 'Hero choice' },
          { title: 'Component primitives', detail: 'Buttons, cards, sections.',            deliverable: 'Primitives.tsx' },
        ],
      },
      {
        name: 'Build',
        goal: 'Ship the full site to staging.',
        duration: '4–6 hrs',
        steps: [
          { title: 'Scaffold',        detail: 'Next.js or React + Tailwind. Routes per IA outline.',                       deliverable: 'Working app' },
          { title: 'Page sections',   detail: 'Hero, value props, social proof, FAQ, CTA, footer.',                        deliverable: 'All sections built' },
          { title: 'Responsive pass', detail: 'Mobile-first; test 360/768/1280.',                                          deliverable: 'Mobile-perfect site' },
          { title: 'Polish',          detail: 'Reveal-on-scroll, hover states, micro-interactions, prefers-reduced-motion.', deliverable: 'Production-feel polish' },
        ],
      },
      {
        name: 'Ship',
        goal: "Live on the user's domain with analytics + SEO.",
        duration: '30 min',
        steps: [
          { title: 'SEO + meta',    detail: 'Title, description, OG image, sitemap, robots.', deliverable: 'Indexable site' },
          { title: 'Analytics',     detail: 'Plausible/GA4 wired up. Goal events on CTA.',     deliverable: 'Tracking confirmed' },
          { title: 'Domain + host', detail: 'IONOS DNS pointed; SSL live; preview QA pass.',   deliverable: 'Live URL' },
        ],
      },
    ],
  },

  {
    type: 'automation',
    name: 'AI automation — workflow build',
    summary: 'Single-purpose AI workflow live in a few days. Pattern: ingest → reason → act → notify.',
    phases: [
      {
        name: 'Discovery',
        goal: 'Define the manual task, success criteria, and the integration surface.',
        duration: '45 min',
        steps: [
          { title: 'Map the manual task',   detail: 'Who does it, how often, what inputs, what outputs.',         deliverable: 'Process diagram' },
          { title: 'Success criteria',      detail: 'What does "the automation works" look like? Accuracy/SLA?', deliverable: 'Acceptance criteria doc' },
          { title: 'Integration audit',     detail: 'Which tools? APIs available? Auth model?',                   deliverable: 'Integration list' },
          { title: 'Failure modes',         detail: "What's the cost of a wrong action? Human-in-loop?",          deliverable: 'Risk register' },
        ],
      },
      {
        name: 'Design',
        goal: 'Architect the workflow and decision boundary.',
        duration: '1–2 hrs',
        steps: [
          { title: 'Trigger model',       detail: 'Webhook, polling, schedule, manual.',                    deliverable: 'Trigger choice' },
          { title: 'Prompt design',       detail: 'System prompt, few-shot, output schema (JSON).',         deliverable: 'Prompt file' },
          { title: 'Tool/agent boundary', detail: 'Which steps are tool-calls vs deterministic code?',      deliverable: 'Workflow diagram' },
          { title: 'Observability',       detail: "How will we see what it's doing? Logs, traces, audit?",  deliverable: 'Telemetry plan' },
        ],
      },
      {
        name: 'Build',
        goal: 'Implement and test against real data.',
        duration: '1–3 days',
        steps: [
          { title: 'Scaffolding',      detail: 'Project skeleton, env, auth.',                             deliverable: 'Running locally' },
          { title: 'Trigger + ingest', detail: 'Inbound webhook/poller working with real fixtures.',       deliverable: 'Data flowing in' },
          { title: 'AI step',          detail: 'Prompt + schema; deterministic guards.',                   deliverable: 'AI step returning valid output' },
          { title: 'Action step',      detail: 'API write-back; idempotency keys; retry policy.',          deliverable: 'End-to-end working' },
          { title: 'Notifications',    detail: 'Slack/email confirmations; failure alerts.',               deliverable: 'Visible to humans' },
        ],
      },
      {
        name: 'Ship & monitor',
        goal: 'Live in client environment with safety rails.',
        duration: 'half day',
        steps: [
          { title: 'Dry-run',    detail: 'Run against last 30 days of real inputs in shadow mode.', deliverable: 'Confidence > 95%' },
          { title: 'Go-live',    detail: 'Enable in prod with circuit breaker.',                    deliverable: 'Live + monitored' },
          { title: 'Handoff doc', detail: 'How to pause, debug, extend.',                           deliverable: 'Runbook in Notion' },
        ],
      },
    ],
  },

  {
    type: 'web_app',
    name: 'Web app / SaaS MVP',
    summary: 'Full-stack web app MVP. Auth, billing optional, core flows live in weeks.',
    phases: [
      {
        name: 'Discovery',
        goal: 'Lock the core user, the core job, and the cut.',
        duration: '1 hr',
        steps: [
          { title: 'User & job',         detail: 'Who is this for? What job is it doing for them?', deliverable: 'One-line product statement' },
          { title: 'MVP slice',          detail: "What's in, what's out, why.",                     deliverable: 'Scope sheet' },
          { title: 'Data model sketch',  detail: 'Entities, relationships, key fields.',            deliverable: 'ER diagram' },
        ],
      },
      {
        name: 'Architecture',
        goal: 'Stack, hosting, auth, payments.',
        duration: '2 hrs',
        steps: [
          { title: 'Stack pick',   detail: 'Next.js / React + Tailwind + Supabase / Postgres + Stripe.', deliverable: 'Stack doc' },
          { title: 'Schema',       detail: 'SQL migration with RLS policies.',                          deliverable: '001_initial.sql' },
          { title: 'Auth flow',    detail: 'Sign up, sign in, invite, reset, OAuth.',                   deliverable: 'Auth working' },
          { title: 'Hosting plan', detail: 'Vercel/IONOS, env vars, CI.',                               deliverable: 'Staging URL' },
        ],
      },
      {
        name: 'Build core flows',
        goal: 'The MVP slice working end-to-end.',
        duration: '1–3 weeks',
        steps: [
          { title: 'Empty shell',     detail: 'App layout, nav, role gates.',                          deliverable: 'Authed shell' },
          { title: 'Primary CRUD',    detail: "The main entity's create/read/update/delete.",          deliverable: 'CRUD working' },
          { title: 'Secondary flows', detail: 'Anything the primary flow depends on.',                 deliverable: 'Flows complete' },
          { title: 'Billing (if)',    detail: 'Stripe checkout + webhook + plan gating.',              deliverable: 'First test charge' },
        ],
      },
      {
        name: 'Polish & ship',
        goal: 'MVP feels like a real product.',
        duration: '2–4 days',
        steps: [
          { title: 'Empty states', detail: 'First-run, no data, error, success.', deliverable: 'Designed empty states' },
          { title: 'Mobile pass',  detail: 'Real-device test on iOS + Android.',  deliverable: 'Mobile-ready' },
          { title: 'Onboarding',   detail: 'New user gets to first value in <60s.', deliverable: 'Activation flow' },
          { title: 'Go-live',      detail: 'Production deploy, monitoring, runbook.', deliverable: 'Live + monitored' },
        ],
      },
    ],
  },

  {
    type: 'custom_software',
    name: 'Custom internal software',
    summary: 'Bespoke internal tooling built around how the client actually works.',
    phases: [
      {
        name: 'Process discovery',
        goal: 'Understand the current workflow before changing it.',
        duration: '2–4 hrs (incl. shadowing)',
        steps: [
          { title: 'Shadow the operator', detail: 'Sit with the person doing the work today. Record steps.', deliverable: 'Annotated process map' },
          { title: 'Pain & savings',      detail: 'Where is time/money leaking? Quantify if possible.',      deliverable: 'Pain list with £' },
          { title: 'Constraints',         detail: 'Existing systems we must integrate with.',                deliverable: 'Constraint list' },
        ],
      },
      {
        name: 'Solution design',
        goal: 'Design the tool that fits the process, not the other way round.',
        duration: '1 day',
        steps: [
          { title: 'User journey', detail: "Operator's new workflow with the tool.",      deliverable: 'Journey diagram' },
          { title: 'Data model',   detail: 'Entities, integrations, sources of truth.',   deliverable: 'ER + integration map' },
          { title: 'UI sketches',  detail: 'Key screens, low fidelity.',                  deliverable: 'Wireframes' },
        ],
      },
      {
        name: 'Build',
        goal: 'Working tool, integrated with the existing stack.',
        duration: '1–3 weeks',
        steps: [
          { title: 'Scaffold + auth',  detail: 'Per company SSO if needed.',                          deliverable: 'Internal-only login' },
          { title: 'Integrations',     detail: 'Connect to existing systems via API/SDK.',            deliverable: 'Live data flowing' },
          { title: 'Core screens',     detail: "Build the operator's daily-driver views.",            deliverable: 'Operator can do their job' },
          { title: 'Admin/reporting',  detail: 'Visibility for managers.',                            deliverable: 'Reports + filters' },
        ],
      },
      {
        name: 'Rollout',
        goal: 'Operators using it daily, old process retired.',
        duration: '1 week',
        steps: [
          { title: 'Pilot',        detail: 'One operator uses it for a week alongside the old way.', deliverable: 'Pilot feedback' },
          { title: 'Train + dock', detail: 'Train the team, write the doc.',                          deliverable: 'Trained team' },
          { title: 'Cutover',      detail: 'Old process retired. Tool is the source of truth.',       deliverable: 'Production rollout' },
        ],
      },
    ],
  },

  {
    type: 'platform',
    name: 'Full platform — multi-tenant',
    summary: 'Multi-tenant platform with multiple user roles, billing, and ongoing iteration.',
    phases: [
      {
        name: 'Strategy',
        goal: 'Lock the business model and the core loops.',
        duration: '1–2 days',
        steps: [
          { title: 'Business model', detail: 'Who pays, for what, how often.',                       deliverable: 'Model doc' },
          { title: 'Core loops',     detail: 'Acquisition / activation / retention / monetisation.', deliverable: 'Loop diagrams' },
          { title: 'Role matrix',    detail: 'Roles, permissions, tenant boundaries.',               deliverable: 'Role matrix' },
        ],
      },
      {
        name: 'Architecture',
        goal: 'Multi-tenant data, auth, billing, observability.',
        duration: '2–3 days',
        steps: [
          { title: 'Tenancy model', detail: 'Schema-per-tenant or row-level multi-tenant.',         deliverable: 'Tenancy ADR' },
          { title: 'Schema + RLS',  detail: 'Migration with tenant isolation enforced.',            deliverable: '001_initial.sql' },
          { title: 'Auth + roles',  detail: 'Signup, invite, role gates, SSO option.',              deliverable: 'Auth working' },
          { title: 'Billing',       detail: 'Stripe billing portal, plan gating, usage metering.',  deliverable: 'Billing live in staging' },
          { title: 'Observability', detail: 'Logging, error tracking, product analytics.',          deliverable: 'Telemetry stack' },
        ],
      },
      {
        name: 'Build MVP slice',
        goal: "The platform's minimum lovable surface area.",
        duration: '3–8 weeks',
        steps: [
          { title: 'Tenant onboarding', detail: 'Sign up, create org, invite teammates, set up.',         deliverable: 'New tenant fully onboarded' },
          { title: 'Primary loop',      detail: 'The one user job the platform exists to do.',            deliverable: 'Loop closes end-to-end' },
          { title: 'Secondary loops',   detail: 'Notifications, admin, settings, integrations.',          deliverable: 'Supporting surfaces built' },
          { title: 'Mobile + perf',     detail: 'Mobile-ready; first contentful paint < 1.5s.',           deliverable: 'Mobile + perf budget met' },
        ],
      },
      {
        name: 'Beta + iterate',
        goal: 'Real customers on the platform; weekly shipping.',
        duration: 'Ongoing',
        steps: [
          { title: 'Closed beta',    detail: '3–10 design-partner tenants.',           deliverable: 'Live beta usage' },
          { title: 'Weekly cadence', detail: 'Ship every week against the loops.',     deliverable: 'Weekly release notes' },
          { title: 'Open up',        detail: 'Remove the gate; public signup.',        deliverable: 'Public launch' },
        ],
      },
    ],
  },
];

const CLAUDE_HANDOFFS = {
  website: `# Project handoff — Marketing site

You are picking up a same-day marketing site build. Treat this as a brand-register design task (the site IS the product).

## Constraints
- Stack: React + Tailwind (or Next.js if SEO matters). Deploy to IONOS hosting via static export when possible.
- Pricing tier: £500 one-off + £100/m hosting & care.
- Delivery target: live within 24 hours of brief.

## Order of operations
1. Read \`docs/brief.md\` for brand, audience, IA, copy direction.
2. Set design tokens (OKLCH colors, fluid typography with \`clamp()\`, spacing scale).
3. Build sections in this order: hero, value props, social proof, FAQ, CTA, footer.
4. Responsive pass at 360 / 768 / 1280.
5. Polish: reveal-on-scroll, hover states, prefers-reduced-motion guards.
6. SEO (title/meta/OG/sitemap/robots) + analytics (Plausible by default).
7. Deploy to staging URL. Final QA. Cut over DNS on IONOS.

## Non-goals
- No CMS unless explicitly asked.
- No backend unless explicitly asked.
- No gradient text in headlines. No s p a c e d letter-spaced labels. No glassmorphism by default.

## Definition of done
- Lighthouse Performance >= 90 on mobile.
- All sections work at 360px width.
- Contact form (if present) routes to the client's inbox.
- Domain live with valid SSL.
`,

  automation: `# Project handoff — AI automation

You are building a single-purpose AI workflow. Pattern: ingest → reason → act → notify.

## Constraints
- Use the cheapest model that hits the accuracy bar. Default to claude-sonnet-4-6 unless evals show otherwise.
- Every action that writes to the real world must be idempotent and have a circuit breaker.
- Every step must be observable (log structured events + a human-readable trace).

## Order of operations
1. Read \`docs/process-map.md\` and \`docs/acceptance.md\`.
2. Define the trigger (webhook / poller / schedule / manual).
3. Write the prompt: system prompt with role + constraints, few-shot examples from \`docs/fixtures/\`, JSON output schema with a deterministic parser.
4. Wire the action step. Add idempotency keys keyed on the input hash.
5. Add notifications (Slack/email) for both success and failure.
6. Build a dry-run mode that runs against the last 30 days of inputs without writing.
7. Hit > 95% on the dry-run before going live.
8. Write the runbook (\`docs/runbook.md\`): how to pause, debug, extend.

## Non-goals
- No new database unless the workflow genuinely needs persistence.
- No web UI unless the operator needs one (most don't).
- No multi-step agentic loops if a single prompt suffices.

## Definition of done
- Dry-run confidence >= 95% on real recent inputs.
- Circuit breaker tested.
- Operator can pause without our help.
`,

  web_app: `# Project handoff — Web app / SaaS MVP

You are building an MVP. Ship the smallest thing that closes the loop.

## Constraints
- Stack: Next.js (App Router) + Tailwind + Supabase (Postgres + Auth + Storage) + Stripe (if billing).
- Auth: magic-link + Google + email/password. Roles in a \`profiles\` table.
- All Postgres tables have RLS policies. No service-role usage from the browser.

## Order of operations
1. Read \`docs/product-statement.md\` and \`docs/scope.md\`.
2. Write \`supabase/migrations/001_initial.sql\` covering schema + RLS + triggers.
3. Scaffold Next.js with (auth) and (app) route groups.
4. Implement auth flows: sign in, sign up, callback, protected layout.
5. Build the primary entity CRUD. Then secondary flows.
6. Add billing only if scope says so.
7. Empty states, error states, mobile pass, onboarding flow.
8. Deploy to Vercel. Add error monitoring (Sentry) + product analytics (Plausible).

## Non-goals
- No premature optimisation (no Redis, no microservices, no GraphQL).
- No infinite-scroll if pagination works.
- No design-system rebuild — use Tailwind + the existing tokens.

## Definition of done
- A new user signs up and reaches first value in under 60 seconds.
- All RLS policies tested with a second user account.
- Stripe webhook idempotent.
- Mobile-ready on real iOS + Android device.
`,

  custom_software: `# Project handoff — Custom internal software

You are building bespoke internal tooling. Optimise for the operator, not for resale.

## Constraints
- Stack: pick the lightest thing the client can host — usually Next.js + Postgres, sometimes a SPA + Supabase.
- Auth: company SSO if they have it; otherwise email + password gated to their domain.
- Integrate with the systems the client already runs. Do not introduce new SaaS unless asked.

## Order of operations
1. Read \`docs/process-map.md\` (annotated from the shadowing session) and \`docs/constraints.md\`.
2. Design the new operator journey. Confirm with the operator before building.
3. Build the data model around the real entities in the client's business, not generic abstractions.
4. Build the operator's daily-driver views first. Manager/reporting views second.
5. Wire the integrations using the client's existing APIs / SDKs.
6. Pilot with one operator alongside the old process for one week.
7. Cut over only when pilot feedback is incorporated.
8. Write the runbook + train the team.

## Non-goals
- No public-facing UI unless explicitly part of scope.
- No new auth system if the client has SSO.
- No "configurable for the future" — build the thing they need now.

## Definition of done
- The operator does their job faster than before, measured in real minutes.
- The old process is fully retired.
- A second team member can run the tool from the runbook alone.
`,

  platform: `# Project handoff — Full platform (multi-tenant)

You are building a multi-tenant platform. Tenancy and billing are first-class concerns from day one.

## Constraints
- Stack: Next.js + Postgres (multi-tenant via row-level security) + Stripe Billing + Resend/Postmark for email.
- Every table has a tenant_id column and an RLS policy enforcing isolation.
- All cross-tenant queries go through admin endpoints with explicit checks.

## Order of operations
1. Read \`docs/business-model.md\`, \`docs/loops.md\`, \`docs/role-matrix.md\`.
2. Write \`docs/adr/0001-tenancy.md\` documenting tenancy choice.
3. Write \`supabase/migrations/001_initial.sql\`. Include tenant_id + RLS on every table.
4. Build the auth + onboarding flow: sign up creates a new tenant; invite-by-email adds members.
5. Stand up the billing surface early. Plan gating from week one.
6. Build the primary loop end-to-end before any secondary surfaces.
7. Add observability before opening to beta: error tracking, product analytics, audit log.
8. Closed beta with 3–10 design partners. Weekly release cadence.

## Non-goals
- No "we'll add multi-tenancy later". You can't bolt on isolation.
- No premature admin tooling for ourselves — use SQL.
- No marketing site coupled to the platform — keep them separate.

## Definition of done
- A new tenant signs up, invites a teammate, completes the primary loop, and gets billed correctly without our help.
- Tenant isolation verified with red-team queries.
- One full release cycle (build → ship → measure → iterate) demonstrated.
`,
};

const findTemplate = (type, name) =>
  PLAN_TEMPLATES.find(p => p.type === type && (!name || p.name === name));

module.exports = { PLAN_TEMPLATES, CLAUDE_HANDOFFS, findTemplate };
