// =============================================================
// Universal plan-of-action templates per project type.
// Used to seed the plan_templates table and to spawn project_plans.
// Each template is intentionally structured for Claude Code handoff.
//
// v4 (2026-06-08): expanded for the Render-hosted, fully-automated
// platform. Every handoff now contains:
//   1. A context contract  — the exact DB knobs + docs the build reads.
//   2. An automation contract — how the headless Claude Code worker
//      runs it (branch/PR protocol, telemetry write-back, stop rules).
//   3. Style adapters — how the prompt mutates per project style
//      (read from projects.metadata.style). Also exported as
//      STYLE_ADAPTERS for programmatic composition.
//   4. Measurable acceptance gates.
//
// Three new types: maintenance, aiseo, lead_engine.
// NOTE: requires migration 006_plan_template_types.sql (relaxes the
// plan_templates.type CHECK constraint) before seeding.
//
// Authored as CommonJS so both webpack (React app) and Node (seed script)
// can require it without transpile.
// =============================================================

// Shared automation-contract block injected into every handoff.
const AUTOMATION_CONTRACT = `
## Automation contract (headless run protocol)

You are usually run headless by the out-of-house.dev worker (Render background
worker, Claude Agent SDK). Obey this protocol exactly:

- **Branch**: \`ooh/<project-slug>/<request-id>-<kebab-title>\`. Never commit to main.
- **Commits**: conventional commits (\`feat:\`, \`fix:\`, \`chore:\`), one commit per
  logical slice, no WIP commits left behind.
- **Verify before PR**: run the project's verification commands (lint, typecheck,
  build, tests). A PR with a red build is a protocol violation. If verification
  fails twice after self-fixes, stop and flag.
- **PR protocol**: open exactly one PR. Body must contain: Scope (1 para),
  What changed (file list), How verified (commands + output summary),
  Risk class (\`low\` | \`standard\` | \`high\`), Preview URL if available.
  Title prefix \`[NEEDS HUMAN]\` if any stop condition fired.
- **Risk classes**: \`low\` = copy/content/style-token changes, doc-only changes.
  \`standard\` = new UI, new endpoints, new jobs. \`high\` = auth, billing,
  permissions, data migrations, outbound email, anything destructive.
  High-risk PRs are NEVER auto-merged.
- **Telemetry write-back**: the worker records claude_runs (status, pr_url,
  preview_url, tokens_in/out, cost_gbp, duration_ms). End your final message with a
  fenced json block: {"files_changed":n,"tests":"pass|fail","risk":"low|standard|high"}.
- **Stop conditions** (open PR titled [NEEDS HUMAN], explain in body, do NOT guess):
  missing secret or API key; acceptance criteria ambiguous or contradictory;
  destructive migration required; third-party account action needed; budget/cost
  cap reached; verification failing after 2 self-fix loops.
- **Never**: push to main, touch unrelated files, rotate or print secrets,
  weaken auth/permission checks, disable tests to go green, send real emails
  or charge real cards from a build run (use dry-run modes).
`;

const PLAN_TEMPLATES = [
  // ===========================================================
  // 1 · WEBSITE
  // ===========================================================
  {
    type: 'website',
    name: 'Marketing site: same-day delivery',
    summary: 'Single-day landing site or small marketing site. Discovery to live in under 24 hours, deployed to Render with DNS on IONOS.',
    phases: [
      {
        name: 'Discovery',
        goal: 'Capture brand, audience, IA, and copy direction in 30 minutes.',
        duration: '30 min',
        steps: [
          { title: 'Brand & audience',         detail: 'Tone, anti-references, audience profile, conversion goal. Auto-drafted from application + intake form by the scoper; human confirms.', deliverable: 'One-page brief (docs/brief.md)' },
          { title: 'Information architecture', detail: 'Page list, section order, primary CTA, secondary CTAs.',     deliverable: 'IA outline' },
          { title: 'Copy direction',           detail: 'Hero, value props, social proof, CTA copy in voice. AI-drafted, client approves async in portal.', deliverable: 'Draft copy block' },
          { title: 'Style selection',          detail: 'Pick style adapter: brochure-local-smb / conversion-landing / portfolio-creative / ecommerce-lite / content-hub-seo. Stored in projects.metadata.style.', deliverable: 'metadata.style set' },
        ],
      },
      {
        name: 'Design',
        goal: 'Lock visual direction. Tokens, type, hero treatment.',
        duration: '1 hr',
        steps: [
          { title: 'Color & type tokens',  detail: 'OKLCH palette from brand colors (metadata.brand_colors), font pairing, fluid scale.', deliverable: 'tokens.css' },
          { title: 'Hero direction',       detail: 'Two distinct hero options generated; client (or admin) picks one in portal.', deliverable: 'Hero choice' },
          { title: 'Asset pull',           detail: 'Logos via LogoVault API; hero imagery via image-gen worker or stock. No manual scraping.', deliverable: 'assets/ populated' },
          { title: 'Component primitives', detail: 'Buttons, cards, sections.', deliverable: 'Primitives built' },
        ],
      },
      {
        name: 'Build',
        goal: 'Ship the full site to a Render preview.',
        duration: '4–6 hrs (wall-clock, mostly autonomous)',
        steps: [
          { title: 'Scaffold',        detail: 'From the ooh-starter-site template repo (Vite + React + Tailwind, static export). Routes per IA outline.', deliverable: 'Working app' },
          { title: 'Page sections',   detail: 'Hero, value props, social proof, FAQ, CTA, footer — per style adapter.', deliverable: 'All sections built' },
          { title: 'Responsive pass', detail: 'Mobile-first; verify 360/768/1280 via screenshot checks.', deliverable: 'Mobile-perfect site' },
          { title: 'Polish',          detail: 'Reveal-on-scroll, hover states, micro-interactions, prefers-reduced-motion.', deliverable: 'Production-feel polish' },
          { title: 'AISEO baseline',  detail: 'JSON-LD (Organization/Service/FAQ), llms.txt, robots.txt allowing AI crawlers, sitemap.xml. Every site we ship passes our own 14-axis audit at grade B or better.', deliverable: 'Audit grade >= B' },
        ],
      },
      {
        name: 'Ship',
        goal: "Live on the client's domain with analytics + SEO, hosted on Render.",
        duration: '30 min',
        steps: [
          { title: 'SEO + meta',    detail: 'Title, description, OG image (auto-generated), sitemap, robots.', deliverable: 'Indexable site' },
          { title: 'Analytics',     detail: 'First-party analytics snippet (platform-hosted) wired; goal events on CTA.', deliverable: 'Tracking confirmed' },
          { title: 'Deploy + domain', detail: 'Worker creates Render static site via Render API, adds custom domain, returns DNS records; IONOS DNS pointed; SSL auto.', deliverable: 'Live URL + client_sites row' },
          { title: 'Care plan',     detail: 'Uptime monitor registered, £100/mo care subscription started via Stripe, handoff email sent.', deliverable: 'Monitored + billed' },
        ],
      },
    ],
  },

  // ===========================================================
  // 2 · AUTOMATION
  // ===========================================================
  {
    type: 'automation',
    name: 'AI automation: workflow build',
    summary: 'Single-purpose AI workflow live in a few days. Pattern: ingest → reason → act → notify. Deployed as a worker/cron on Render or on the client stack.',
    phases: [
      {
        name: 'Discovery',
        goal: 'Define the manual task, success criteria, and the integration surface.',
        duration: '45 min',
        steps: [
          { title: 'Map the manual task',   detail: 'Who does it, how often, what inputs, what outputs. Auto-drafted pre-call brief from intake; refined on the scoping call.', deliverable: 'Process diagram (docs/process-map.md)' },
          { title: 'Success criteria',      detail: 'What does "the automation works" look like? Accuracy/SLA targets, measured how.', deliverable: 'docs/acceptance.md' },
          { title: 'Integration audit',     detail: 'Which tools? APIs available? Auth model? Stored in metadata.integrations.', deliverable: 'Integration list' },
          { title: 'Failure modes',         detail: 'Cost of a wrong action? Human-in-loop points? Circuit-breaker thresholds.', deliverable: 'Risk register' },
          { title: 'Style selection',       detail: 'Pick style adapter: inbox-triage / document-pipeline / rag-copilot / crm-enrichment / support-agent / cross-system-workflow.', deliverable: 'metadata.style set' },
        ],
      },
      {
        name: 'Design',
        goal: 'Architect the workflow and decision boundary.',
        duration: '1–2 hrs',
        steps: [
          { title: 'Trigger model',       detail: 'Webhook, polling, schedule, manual.', deliverable: 'Trigger choice' },
          { title: 'Prompt design',       detail: 'System prompt, few-shot from docs/fixtures/, strict JSON output schema + deterministic parser.', deliverable: 'Prompt file' },
          { title: 'Tool/agent boundary', detail: 'Which steps are tool-calls vs deterministic code?', deliverable: 'Workflow diagram' },
          { title: 'Observability',       detail: 'Structured run logs to automation_runs, human-readable trace, failure alerts.', deliverable: 'Telemetry plan' },
        ],
      },
      {
        name: 'Build',
        goal: 'Implement and test against real data.',
        duration: '1–3 days',
        steps: [
          { title: 'Scaffolding',      detail: 'From ooh-automation-worker template repo (Node + pg-boss or client-stack equivalent), env, auth.', deliverable: 'Running locally' },
          { title: 'Trigger + ingest', detail: 'Inbound webhook/poller working with real fixtures.', deliverable: 'Data flowing in' },
          { title: 'AI step',          detail: 'Prompt + schema; deterministic guards; eval set with 20+ fixtures.', deliverable: 'AI step at accuracy bar on evals' },
          { title: 'Action step',      detail: 'API write-back; idempotency keys on input hash; retry policy.', deliverable: 'End-to-end working' },
          { title: 'Notifications',    detail: 'Slack/email confirmations; failure alerts.', deliverable: 'Visible to humans' },
        ],
      },
      {
        name: 'Ship & monitor',
        goal: 'Live in client environment with safety rails.',
        duration: 'half day',
        steps: [
          { title: 'Dry-run',    detail: 'Shadow mode against last 30 days of real inputs. Worker compiles accuracy report automatically.', deliverable: 'Confidence > 95%' },
          { title: 'Go-live',    detail: 'Enable in prod with circuit breaker; uptime + error monitors registered.', deliverable: 'Live + monitored' },
          { title: 'Handoff doc', detail: 'Runbook auto-drafted: how to pause, debug, extend. 30-day fix window starts.', deliverable: 'docs/runbook.md in client portal' },
        ],
      },
    ],
  },
  // ===========================================================
  // 3 · WEB APP
  // ===========================================================
  {
    type: 'web_app',
    name: 'Web app / SaaS MVP',
    summary: 'Full-stack web app MVP. Auth, billing optional, core flows live in weeks. Render web service + Postgres.',
    phases: [
      {
        name: 'Discovery',
        goal: 'Lock the core user, the core job, and the cut.',
        duration: '1 hr',
        steps: [
          { title: 'User & job',         detail: 'Who is this for? What job is it doing for them?', deliverable: 'One-line product statement' },
          { title: 'MVP slice',          detail: "What's in, what's out, why.", deliverable: 'Scope sheet' },
          { title: 'Data model sketch',  detail: 'Entities, relationships, key fields.', deliverable: 'ER diagram' },
          { title: 'Style selection',    detail: 'Pick style adapter: b2b-saas / client-portal / marketplace / dashboard-analytics / pwa-mobile. Plus metadata.tenancy, auth_providers, billing_model, ai_features.', deliverable: 'metadata set' },
        ],
      },
      {
        name: 'Architecture',
        goal: 'Stack, hosting, auth, payments.',
        duration: '2 hrs',
        steps: [
          { title: 'Stack pick',   detail: 'Default: Vite/Next + Tailwind + Node API + Postgres on Render + Stripe.', deliverable: 'Stack doc' },
          { title: 'Schema',       detail: 'SQL migrations with per-tenant scoping and authorization tests.', deliverable: 'migrations/001_initial.sql' },
          { title: 'Auth flow',    detail: 'Email/password + magic link; Google optional. Sessions httpOnly.', deliverable: 'Auth working' },
          { title: 'Hosting plan', detail: 'render.yaml blueprint: web + worker + Postgres; preview env per PR.', deliverable: 'Staging URL' },
        ],
      },
      {
        name: 'Build core flows',
        goal: 'The MVP slice working end-to-end.',
        duration: '1–3 weeks',
        steps: [
          { title: 'Empty shell',     detail: 'App layout, nav, role gates.', deliverable: 'Authed shell' },
          { title: 'Primary CRUD',    detail: "The main entity's create/read/update/delete.", deliverable: 'CRUD working' },
          { title: 'Secondary flows', detail: 'Anything the primary flow depends on.', deliverable: 'Flows complete' },
          { title: 'AI features',     detail: 'Wire prompt modules listed in metadata.ai_features (rag, inbox-triage, enrichment...) from the shared module library.', deliverable: 'AI features live' },
          { title: 'Billing (if)',    detail: 'Stripe checkout + webhook + plan gating.', deliverable: 'First test charge' },
        ],
      },
      {
        name: 'Polish & ship',
        goal: 'MVP feels like a real product.',
        duration: '2–4 days',
        steps: [
          { title: 'Empty states', detail: 'First-run, no data, error, success.', deliverable: 'Designed empty states' },
          { title: 'Mobile pass',  detail: 'Real-device test on iOS + Android.', deliverable: 'Mobile-ready' },
          { title: 'Onboarding',   detail: 'New user gets to first value in <60s.', deliverable: 'Activation flow' },
          { title: 'Go-live',      detail: 'Render production deploy, monitors, runbook, 30-day fix window.', deliverable: 'Live + monitored' },
        ],
      },
    ],
  },

  // ===========================================================
  // 4 · CUSTOM SOFTWARE
  // ===========================================================
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
          { title: 'Shadow the operator', detail: 'Sit with the person doing the work today. Record + transcribe; AI produces the annotated process map.', deliverable: 'metadata.workflow_dag + docs/process-map.md' },
          { title: 'Pain & savings',      detail: 'Where is time/money leaking? Quantify.', deliverable: 'Pain list with £' },
          { title: 'Constraints',         detail: 'Existing systems to integrate (metadata.existing_tools), operator personas (metadata.operator_personas).', deliverable: 'Constraint list' },
          { title: 'Style selection',     detail: 'Pick style adapter: ops-replacement / integrator-hub / admin-reporting / field-mobile.', deliverable: 'metadata.style set' },
        ],
      },
      {
        name: 'Solution design',
        goal: 'Design the tool that fits the process, not the other way round.',
        duration: '1 day',
        steps: [
          { title: 'User journey', detail: "Operator's new workflow with the tool. Confirm with operator before building.", deliverable: 'Journey diagram' },
          { title: 'Data model',   detail: 'Entities, integrations, sources of truth.', deliverable: 'ER + integration map' },
          { title: 'UI sketches',  detail: 'Key screens, low fidelity.', deliverable: 'Wireframes' },
        ],
      },
      {
        name: 'Build',
        goal: 'Working tool, integrated with the existing stack.',
        duration: '1–3 weeks',
        steps: [
          { title: 'Scaffold + auth',  detail: 'Company SSO if present, else domain-gated email auth.', deliverable: 'Internal-only login' },
          { title: 'Integrations',     detail: 'Connect to existing systems via API/SDK.', deliverable: 'Live data flowing' },
          { title: 'Core screens',     detail: "Operator's daily-driver views first.", deliverable: 'Operator can do their job' },
          { title: 'Admin/reporting',  detail: 'Visibility for managers.', deliverable: 'Reports + filters' },
        ],
      },
      {
        name: 'Rollout',
        goal: 'Operators using it daily, old process retired.',
        duration: '1 week',
        steps: [
          { title: 'Pilot',        detail: 'One operator uses it for a week alongside the old way.', deliverable: 'Pilot feedback' },
          { title: 'Train + dock', detail: 'Train the team; runbook auto-drafted.', deliverable: 'Trained team' },
          { title: 'Cutover',      detail: 'Old process retired. Tool is the source of truth.', deliverable: 'Production rollout' },
        ],
      },
    ],
  },

  // ===========================================================
  // 5 · PLATFORM
  // ===========================================================
  {
    type: 'platform',
    name: 'Full platform: multi-tenant',
    summary: 'Multi-tenant platform with multiple user roles, billing, and ongoing iteration.',
    phases: [
      {
        name: 'Strategy',
        goal: 'Lock the business model and the core loops.',
        duration: '1–2 days',
        steps: [
          { title: 'Business model', detail: 'Who pays, for what, how often.', deliverable: 'Model doc' },
          { title: 'Core loops',     detail: 'Acquisition / activation / retention / monetisation.', deliverable: 'Loop diagrams' },
          { title: 'Role matrix',    detail: 'Roles, permissions, tenant boundaries.', deliverable: 'Role matrix' },
          { title: 'Style selection', detail: 'Pick style adapter: multi-tenant-saas / two-sided-marketplace / internal-platform / white-label.', deliverable: 'metadata.style set' },
        ],
      },
      {
        name: 'Architecture',
        goal: 'Multi-tenant data, auth, billing, observability.',
        duration: '2–3 days',
        steps: [
          { title: 'Tenancy model', detail: 'Row-level multi-tenant by default; schema-per-tenant only with written justification.', deliverable: 'Tenancy ADR' },
          { title: 'Schema + isolation', detail: 'Migration with tenant_id on every table + authorization tests that red-team isolation.', deliverable: '001_initial.sql + passing isolation tests' },
          { title: 'Auth + roles',  detail: 'Signup, invite, role gates, SSO option.', deliverable: 'Auth working' },
          { title: 'Billing',       detail: 'Stripe billing portal, plan gating, usage metering.', deliverable: 'Billing live in staging' },
          { title: 'Observability', detail: 'Logging, error tracking, product analytics, audit log.', deliverable: 'Telemetry stack' },
        ],
      },
      {
        name: 'Build MVP slice',
        goal: "The platform's minimum lovable surface area.",
        duration: '3–8 weeks',
        steps: [
          { title: 'Tenant onboarding', detail: 'Sign up, create org, invite teammates, set up.', deliverable: 'New tenant fully onboarded' },
          { title: 'Primary loop',      detail: 'The one user job the platform exists to do.', deliverable: 'Loop closes end-to-end' },
          { title: 'Secondary loops',   detail: 'Notifications, admin, settings, integrations.', deliverable: 'Supporting surfaces built' },
          { title: 'Mobile + perf',     detail: 'Mobile-ready; FCP < 1.5s.', deliverable: 'Budgets met' },
        ],
      },
      {
        name: 'Beta + iterate',
        goal: 'Real customers on the platform; weekly shipping.',
        duration: 'Ongoing',
        steps: [
          { title: 'Closed beta',    detail: '3–10 design-partner tenants.', deliverable: 'Live beta usage' },
          { title: 'Weekly cadence', detail: 'Ship every week against the loops (each increment = a feature_request through the orchestrator).', deliverable: 'Weekly release notes' },
          { title: 'Open up',        detail: 'Remove the gate; public signup.', deliverable: 'Public launch' },
        ],
      },
    ],
  },
  // ===========================================================
  // 6 · MAINTENANCE (new in v4)
  // ===========================================================
  {
    type: 'maintenance',
    name: 'Maintenance retainer: request cycle',
    summary: 'Steady-state loop for retainer clients. Every request flows scope → build → review → deploy in 2–3 day cycles.',
    phases: [
      {
        name: 'Intake & triage',
        goal: 'Request understood, classified, and scheduled within 4 working hours.',
        duration: '< 4 hrs (automated)',
        steps: [
          { title: 'Auto-scope',     detail: 'Scoper drafts scope + risk class + effort estimate from the request text and repo context.', deliverable: 'Scope on the request' },
          { title: 'Classify',       detail: 'Style adapter chosen automatically: bugfix / perf / security-patch / feature-increment / content-update.', deliverable: 'metadata.style set' },
          { title: 'Senior triage',  detail: 'Human gate: senior confirms priority + risk class in one click (target < 5 min).', deliverable: 'Approved scope' },
        ],
      },
      {
        name: 'Build & verify',
        goal: 'Change implemented on a branch with green verification.',
        duration: '0.5–2 days',
        steps: [
          { title: 'Worker build',   detail: 'Headless Claude Code builds on a clean worktree; regression tests required for bugfixes.', deliverable: 'PR open' },
          { title: 'Auto-review',    detail: 'LLM review + diff classifier; low-risk classes eligible for auto-merge.', deliverable: 'Review verdict' },
          { title: 'Senior review',  detail: 'Human gate for standard/high risk: approve / request changes.', deliverable: 'Merge decision' },
        ],
      },
      {
        name: 'Deploy & report',
        goal: 'Live, monitored, and visible to the client.',
        duration: 'same day',
        steps: [
          { title: 'Deploy',         detail: 'Render auto-deploy on merge; smoke tests run; rollback runbook attached.', deliverable: 'Live' },
          { title: 'Client visibility', detail: 'activity_events + changelog entry + Slack ping, all automatic.', deliverable: 'Client informed' },
          { title: 'Cadence reports', detail: 'digest-weekly (Mondays) + monthly impact report PDF (1st), automatic.', deliverable: 'Reports shipped' },
        ],
      },
    ],
  },

  // ===========================================================
  // 7 · AISEO (new in v4)
  // ===========================================================
  {
    type: 'aiseo',
    name: 'AISEO: foundation + authority programme',
    summary: 'Generative Engine Optimisation. Free audit → foundation deploy → monthly authority + ranking loop.',
    phases: [
      {
        name: 'Audit & onboarding',
        goal: 'Subscriber onboarded with baseline + 30 tracked questions.',
        duration: '1 day',
        steps: [
          { title: 'Baseline audit',  detail: '14-axis audit (automated, free tier did this already). Store score + fix list.', deliverable: 'aiseo_audits row' },
          { title: 'Question set',    detail: 'AI drafts 30 buyer-intent queries from the niche; client approves in portal.', deliverable: 'aiseo_subscriptions.questions' },
          { title: 'Engine set',      detail: 'Default 6 engines; tier decides monitoring depth.', deliverable: 'aiseo_subscriptions.engines' },
        ],
      },
      {
        name: 'Foundation deploy',
        goal: 'Schema, llms.txt, robots, IA fixes live on the client site.',
        duration: '2–4 days',
        steps: [
          { title: 'Schema build',   detail: 'Organization/Product/Service/FAQ/HowTo JSON-LD generated from site content.', deliverable: 'Schema PR' },
          { title: 'llms.txt',       detail: 'Canonical brief at /llms.txt; robots.txt allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended.', deliverable: 'Files live' },
          { title: 'Deploy',         detail: 'If we host the site: auto-PR + merge through the orchestrator. If not: change pack + guided PR to client repo. Human review gate on client-repo PRs.', deliverable: 'Re-audit at grade A' },
        ],
      },
      {
        name: 'Monthly loop',
        goal: 'Rankings pulled, authority shipped, report delivered — every month without prompting.',
        duration: 'Monthly, automated',
        steps: [
          { title: 'Ranking pull',   detail: 'aiseo-ranker job: 30 questions × engines, brand presence + position + cited URLs recorded, deltas computed.', deliverable: 'aiseo_rankings rows + trend' },
          { title: 'Authority drafts', detail: 'AI drafts 3 authority articles + 5 citation pitches from ranking gaps. Human approves pitches (relationship work).', deliverable: 'Drafts in approval queue' },
          { title: 'Adversarial scan', detail: 'Monitor for competitor prompt-injection targeting the brand.', deliverable: 'Defence report' },
          { title: 'Monthly report',  detail: 'PDF report rendered + emailed + posted to client Slack automatically.', deliverable: 'Report delivered' },
        ],
      },
    ],
  },

  // ===========================================================
  // 8 · LEAD ENGINE (new in v4)
  // ===========================================================
  {
    type: 'lead_engine',
    name: 'Lead engine: client onboarding + campaign',
    summary: 'Autonomous pipeline for a client: ICP → discovery → enrichment → scoring → drafting → approval → send → reply → meeting.',
    phases: [
      {
        name: 'ICP onboarding',
        goal: 'Client ICP modelled and validated against real data.',
        duration: '2–3 days',
        steps: [
          { title: 'ICP modelling',   detail: 'AI drafts lead_icps.prompt + rules from closed-won analysis / intake. Client approves.', deliverable: 'lead_icps row' },
          { title: 'Voice prompt',    detail: 'outreach_campaigns.voice_prompt drafted from client writing samples.', deliverable: 'Voice prompt approved' },
          { title: 'Source config',   detail: 'Enable lead_sources adapters relevant to the ICP; suppression list imported.', deliverable: 'Sources live' },
          { title: 'Deliverability',  detail: 'Sending domain + SPF/DKIM/DMARC verified by the deliverability job; warm-up schedule set.', deliverable: 'Domain ready' },
        ],
      },
      {
        name: 'Pipeline live',
        goal: 'Leads flowing end-to-end with the approval gate on.',
        duration: '1 week',
        steps: [
          { title: 'Discovery on',    detail: 'Cron discovers; enrich + score run automatically; acceptance threshold per ICP.', deliverable: 'Scored leads' },
          { title: 'Draft + approve', detail: 'Drafts reference the specific signal. One-click approve/reject/edit at /app/admin/leads (or client portal).', deliverable: 'Approved queue' },
          { title: 'Send + parse',    detail: 'Rate-limited sending; inbound replies parsed (positive → auto-book via Cal.com; unsubscribe → suppress; question → human).', deliverable: 'Replies handled' },
        ],
      },
      {
        name: 'Optimise & scale',
        goal: 'Acceptance stable, auto-mode considered, ads loop on.',
        duration: 'Ongoing',
        steps: [
          { title: 'Weekly tuning',   detail: 'Score-loop retrains thresholds from outcomes; ICP prompt updated.', deliverable: 'Improving acceptance' },
          { title: 'Auto-mode',       detail: 'Per-ICP approval_mode=auto once acceptance is stable (60%+ over 500+ sends).', deliverable: 'Hands-off sending' },
          { title: 'Ads sub-loop',    detail: 'Creative variants generated; pushed via Meta/Google adapters (dry-run until keys present); daily performance pull feeds scoring.', deliverable: 'Ads live' },
        ],
      },
    ],
  },
];

// =============================================================
// STYLE ADAPTERS — how each handoff mutates per project style.
// Key: template type → style key → addendum (markdown).
// The worker composes: CLAUDE_HANDOFFS[type] + STYLE_ADAPTERS[type][style]
// + the per-project context block. Styles live in projects.metadata.style.
// =============================================================
const STYLE_ADAPTERS = {
  website: {
    'brochure-local-smb': `### Style: brochure-local-smb
Local business (café, salon, trades, clinic). 1–5 pages. Optimise for: phone calls,
directions, opening hours, trust. Must-haves: LocalBusiness JSON-LD with geo + hours,
click-to-call sticky CTA on mobile, Google Maps embed, review wall, services list with
prices if provided. Tone: plain, warm, zero jargon. Avoid: long scroll-telling,
web-app-style dashboards, anything requiring login. Imagery: real premises photos if
provided, else subtle local-flavour stock. Performance: aim Lighthouse 95+ mobile —
these users are on phones on 4G.`,
    'conversion-landing': `### Style: conversion-landing
Single high-conversion page for a campaign. One job: the CTA. Structure: hook hero
(outcome-first headline), social proof strip, problem→solution block, offer stack,
risk reversal, FAQ (objection-led), final CTA. Every section ends with the same CTA.
Add: A/B variant scaffold (two hero headline variants behind a query param), goal
events on every CTA, scroll-depth events. Schema: Product/Offer + FAQ. Avoid: nav
links that leak attention (header is logo + CTA only), generic feature lists.`,
    'portfolio-creative': `### Style: portfolio-creative
Designer/photographer/studio. The work IS the message. Structure: minimal hero,
work grid with hover/preview, case-study pages, about, contact. Visual: large
imagery, generous whitespace, restrained type (max 2 faces), subtle motion.
Lazy-load + LQIP for all media. Schema: Person/CreativeWork. Avoid: salesy copy,
testimonial walls, pricing tables unless asked.`,
    'ecommerce-lite': `### Style: ecommerce-lite
Small catalogue (max ~30 SKUs) selling via Stripe Checkout — no full cart platform.
Structure: catalogue grid, product detail with gallery + variant picker, Stripe
Checkout links/payment links, order-confirmation page, shipping/returns pages.
Schema: Product with offers + availability. Wire webhook → order notification email.
Avoid: building inventory management (link to Stripe dashboard), accounts/login.`,
    'content-hub-seo': `### Style: content-hub-seo
Site whose growth engine is content (blog/guides/glossary). Structure: hub pages →
spoke articles, author pages (E-E-A-T), glossary, RSS. Every article: question-led
H1, answer-first opening, stats-with-sources, FAQ block, Article + FAQ schema.
Add llms.txt listing canonical guides. Build an MD/MDX content pipeline so future
articles are file-drops (the content engine will commit them). Avoid: client-side-only
rendering for articles — must be static/SSR for crawlers.`,
  },
  automation: {
    'inbox-triage': `### Style: inbox-triage
Classify→route→draft on a real inbox (Gmail/Outlook/Resend inbound). Labels and
routing rules from docs/acceptance.md. Drafts NEVER auto-send in v1: write to drafts
folder / approval queue. Idempotency on message-id. Eval set: 50+ real historical
emails, accuracy target 95%+ on routing, 90%+ draft-usable-as-is. Privacy: never
log full bodies; log message-ids + classifications.`,
    'document-pipeline': `### Style: document-pipeline
PDF/invoice/form extraction → structured rows. Strict output JSON schema with
confidence per field; below-threshold fields → human-review queue, never guessed.
Use deterministic parsers first (regex/table extraction), LLM for the residue.
Eval: 30+ real docs, field-level accuracy 98%+ on critical fields (amounts, dates,
IDs). Store originals; every extracted row links back to source page.`,
    'rag-copilot': `### Style: rag-copilot
Internal Q&A over the client's docs. Pipeline: ingest → chunk (semantic, ~500 tokens,
overlap) → embed → pgvector store → retrieve top-k + rerank → answer WITH citations.
Every answer must cite sources; "I don't know" beats hallucination (test for it).
Refresh job re-ingests changed docs nightly. Eval: 25 golden Q→A pairs, groundedness
checked. UI: chat with source-chip links, feedback thumbs that log to evals.`,
    'crm-enrichment': `### Style: crm-enrichment
Lookup → enrich → write back to HubSpot/Salesforce/Pipedrive. Never overwrite
human-entered fields (merge policy: fill-blanks-only unless field flagged stale).
Batch + rate-limit to vendor API quotas. Every write tagged with source + timestamp
in a note/custom field. Dry-run mode produces a diff CSV for approval before the
first live run.`,
    'support-agent': `### Style: support-agent
Front-line response with escalation. Tiered: FAQ/known-issue → auto-draft reply
(approval queue first 30 days); unknown/angry/legal/refund → escalate to human with
full context summary. Tone cloned from past replies. Never promise refunds, dates,
or legal positions. Measure: deflection rate, escalation precision, CSAT on AI-drafted
replies vs human baseline.`,
    'cross-system-workflow': `### Style: cross-system-workflow
Multi-step orchestration across systems (e.g. Stripe event → tag customer → Slack →
Linear issue). Model as an explicit state machine with persisted state per run —
NOT a chain of webhooks. Each step idempotent + independently retryable; dead-letter
queue + replay tool. Diagram in docs/workflow.md generated from the state machine
definition so docs never drift.`,
  },
  web_app: {
    'b2b-saas': `### Style: b2b-saas
Org-based accounts (workspace, invites, roles), Stripe subscription billing with
trial, plan gating middleware, settings/team/billing pages, onboarding checklist.
Activation metric defined in docs/scope.md — instrument it from day one.`,
    'client-portal': `### Style: client-portal
The client's customers log in to see their own stuff (orders/projects/documents).
Magic-link-first auth (these users forget passwords), strict per-customer scoping
with isolation tests, white-label theming from a config table, notification emails
on every state change visible in-portal.`,
    'marketplace': `### Style: marketplace
Two user populations (buyers/sellers) + listings + transactions. Stripe Connect
(destination charges) for split payments, KYC onboarding flow for sellers, listing
moderation queue (AI pre-screen + human approve), dispute states. Do NOT build
custom payments — Connect does the heavy lifting.`,
    'dashboard-analytics': `### Style: dashboard-analytics
Read-heavy reporting over an existing data source. Materialised views / rollup tables
for every chart (no raw aggregate queries per page-load), date-range + filter state in
URL, CSV export, scheduled email snapshots. Charts: one library, consistent palette,
empty/loading/error states for every panel.`,
    'pwa-mobile': `### Style: pwa-mobile
Mobile-first PWA where an app store is overkill. Service worker (offline shell +
queued mutations), install prompt, push notifications (where supported), touch-target
44px+, thumb-zone layout. Test offline→online sync explicitly. Lighthouse PWA
checklist must pass.`,
  },
  custom_software: {
    'ops-replacement': `### Style: ops-replacement
Replacing a spreadsheet/manual process. The spreadsheet IS the spec: import it,
preserve every column the operators actually use, add validation it never had.
Migration script + parallel-run mode (old + new side by side for the pilot week).
Keyboard-first data entry — operators live in this thing.`,
    'integrator-hub': `### Style: integrator-hub
Glue between systems that don't talk. Canonical data model in the middle (don't
mirror either side's quirks), sync jobs with cursor-based incremental pulls, conflict
policy documented per entity, sync-health dashboard with per-connector status +
last-success + error samples.`,
    'admin-reporting': `### Style: admin-reporting
Manager visibility over operational data. Role-scoped views, drill-down from
summary → row detail, exception highlighting (what needs attention TODAY on top),
scheduled PDF/email digests, audit trail of who looked at / changed what.`,
    'field-mobile': `### Style: field-mobile
Used on phones/tablets in the field (site visits, inspections, deliveries).
Offline-first (queue + sync), camera/photo capture with compression, GPS stamps,
big-button UI usable with gloves/sunlight, signature capture if needed. Test on a
real mid-range Android.`,
  },
  platform: {
    'multi-tenant-saas': `### Style: multi-tenant-saas
Standard tenanted SaaS. tenant_id on every row + isolation tests; per-plan feature
flags; usage metering into a usage table from day one (billing will want it);
tenant-level audit log; data export per tenant (GDPR + enterprise sales both ask).`,
    'two-sided-marketplace': `### Style: two-sided-marketplace
Everything in multi-tenant-saas PLUS: supply/demand split onboarding, matching/search
surface, Stripe Connect payouts, trust features (reviews, verification badges),
liquidity metrics on the admin dashboard (fill rate, time-to-match).`,
    'internal-platform': `### Style: internal-platform
One org, many departments. SSO (their IdP), department-scoped roles, change-request
workflow (this platform will outlive its first owner), strong audit + approval chains,
integration-first (it must talk to what exists, not replace it).`,
    'white-label': `### Style: white-label
Resellable under partner brands. Theme/config per partner tenant (logo, colors,
domain), partner admin layer above tenant admin, per-partner Stripe Connect or
invoicing, custom-domain automation (Render API per partner domain), docs the
partner can rebrand.`,
  },
  maintenance: {
    'bugfix': `### Style: bugfix
Reproduce FIRST: write the failing test that proves the bug, then fix, then show the
test green. Root-cause note in the PR (what broke, why, blast radius). Regression
guard: search for the same pattern elsewhere in the repo and fix siblings. Risk class
auto-suggests low only if no schema/auth/billing files touched.`,
    'perf': `### Style: perf
Measure before touching: capture baseline (timings, query plans, bundle size).
Fix the top bottleneck only; re-measure; show before/after numbers in the PR.
No speculative optimisation. If the fix is a query: include EXPLAIN ANALYZE
before/after.`,
    'security-patch': `### Style: security-patch
Always risk class high. Patch the vulnerability, add a test proving it's closed,
scan for the same class of issue repo-wide, note CVE/advisory if dependency-driven.
Never auto-merge. Changelog entry written but embargoed until merged.`,
    'feature-increment': `### Style: feature-increment
Small new capability on an existing surface. Mirror the patterns of the surface
you're extending (don't introduce new state libs/styles). Feature-flag if user-facing
and non-trivial. Update the client-facing changelog draft.`,
    'content-update': `### Style: content-update
Copy/images/data-file changes only. Risk class low — eligible for auto-merge when
diff-classifier agrees (no JS logic, no schema, no env). Screenshot before/after
in the PR for visual confirmation.`,
  },
  aiseo: {
    'foundation-deploy': `### Style: foundation-deploy
Shipping schema/llms.txt/robots/IA fixes to a client site. If we host it: standard
PR through the orchestrator. If client-hosted: produce a change pack (files + exact
diffs + deploy instructions) and, where repo access exists, open the PR on their repo
— always [NEEDS HUMAN] review before merge to a repo we don't own. Re-run the 14-axis
audit after deploy and attach before/after scores to the PR.`,
    'authority-content': `### Style: authority-content
3 authority articles/month engineered to be the canonical source LLMs quote:
question-led H1, answer-first first paragraph, stats with linked primary sources,
FAQ block, Article schema, author with Person schema. Draft → human approves → commit
to the client content pipeline. Citation pitches (5/mo) are DRAFTS ONLY — humans own
the relationships and the sending.`,
    'monitoring-setup': `### Style: monitoring-setup
Wiring a new subscription into the ranker: validate the 30 questions (buyer-intent,
answerable, non-overlapping), confirm engine list per tier, baseline pull immediately,
alert thresholds (brand-presence drop > 20% month-on-month → Slack alert), report
template personalised with client branding.`,
  },
  lead_engine: {
    'icp-onboarding': `### Style: icp-onboarding
New client ICP setup. Draft lead_icps.prompt from closed-won analysis (or intake if
no data). Rules JSONB must map to real adapter parameters (places_query,
incorporation_within_days...). Validate: run discovery in dry-run, hand-score 30
sampled leads vs LLM scores — agreement 80%+ before going live. UK PECR check:
B2B targeting only, corporate addresses, unsubscribe honoured globally.`,
    'campaign-launch': `### Style: campaign-launch
New outreach campaign. voice_prompt from client writing samples (3+). Sequence:
opener + 2 follow-ups, each referencing the discovery signal. send_rate_per_day
starts max 20 during warm-up, ramps per schedule. approval_mode=manual for the first
500 sends, no exceptions. Suppression list checked at draft AND send time.`,
    'source-adapter': `### Style: source-adapter
New lead_sources adapter. Conform to the adapter interface (fetch(config, icp,
limit) → CandidateLead[]); respect robots/ToS and rate limits; dedupe on
company+domain; map fields to the canonical lead shape; fixture-based tests with
recorded responses; enabled=false until first manual QA pass of 50 candidates.`,
    'deliverability': `### Style: deliverability
Sending-domain health. Verify SPF/DKIM/DMARC via DNS-over-HTTPS checks; warm-up
schedule (week 1: 20/day → week 4: full rate); bounce + complaint webhooks wired and
acted on (complaint → suppress + alert); weekly deliverability report (bounce %,
complaint %, domain reputation) to admin.`,
  },
};

const CLAUDE_HANDOFFS = {
  // ===========================================================
  website: `# Project handoff — Marketing site (same-day)

You are picking up a same-day marketing site build for an out-of-house.dev client.
Treat this as a brand-register design task — the site IS the product the client is buying.

## Context contract (read before any code)
- \`projects.description\` + \`projects.metadata\`: brand_colors, target_audience,
  conversion_goal, style (selects the style adapter below), domain, copy_notes.
- \`docs/brief.md\` in the project repo: brand, audience, IA, copy direction.
- Assets: logos via the LogoVault API (\`LOGOVAULT_API_KEY\` env); hero imagery from
  \`assets/\` if the asset job pre-filled it.
- If any of these are missing, generate sensible drafts from the application text,
  mark them ASSUMED in the PR body, and continue — do not stall on missing copy.

## Stack & conventions
- Template repo: \`ooh-starter-site\` (Vite + React + Tailwind, static export).
- Design tokens first: OKLCH palette, fluid type with \`clamp()\`, spacing scale in \`tokens.css\`.
- Pricing tier: £500 one-off + £100/mo hosting & care. Delivery target: live < 24h from brief.
- Hosting: Render static site, created via the Render API by the deploy job;
  client DNS on IONOS (the platform returns the records to set).

## Order of operations
1. Read the context contract. Write \`docs/build-notes.md\` summarising what you're building and which style adapter is active.
2. Set design tokens from brand colors. Two hero options committed behind a query param; default to the stronger one.
3. Build sections in order: hero, value props, social proof, FAQ, CTA, footer — composition per style adapter.
4. Responsive pass at 360 / 768 / 1280. Screenshot each breakpoint into \`docs/screens/\`.
5. Polish: reveal-on-scroll, hover states, micro-interactions, \`prefers-reduced-motion\` guards.
6. AISEO baseline (we eat our own dogfood): Organization/Service/FAQ JSON-LD, \`llms.txt\`,
   robots.txt allowing GPTBot/ClaudeBot/PerplexityBot/Google-Extended, sitemap.xml,
   OG image. Run the platform audit endpoint against the preview — grade must be B or better.
7. Analytics: first-party snippet pointing at the platform collector; goal events on every CTA.
8. Contact form posts to the platform forms endpoint (spam-guarded), routing to the client inbox.
9. Verify: \`npm run lint && npm run build\` + Lighthouse CI (mobile 90+ perf) + audit grade.
10. PR with preview URL. After merge, the deploy job creates/updates the Render service,
    adds the custom domain, registers the uptime monitor, and starts the care subscription.
${AUTOMATION_CONTRACT}
## Style adapters (apply exactly one, from projects.metadata.style)
__STYLES__

## Definition of done
- Lighthouse mobile: Performance 90+ (95+ for brochure-local-smb).
- All sections work at 360px. Screenshots attached.
- Platform AISEO audit grade B+ on the preview URL.
- Contact form delivers to the client inbox (test send verified).
- JSON-LD validates (no errors in schema validator).
- PR opened with risk class + preview URL; no [NEEDS HUMAN] unless a stop condition fired.

## Non-goals
- No CMS unless explicitly in scope. No backend beyond the forms endpoint.
- No gradient text in headlines. No s p a c e d letter-spacing. No glassmorphism by default.
- No cookie banner unless analytics requires it (first-party collector doesn't).
`,

  // ===========================================================
  automation: `# Project handoff — AI automation

You are building a single-purpose AI workflow for a client. Pattern: ingest → reason → act → notify.

## Context contract (read before any code)
- \`projects.metadata\`: style (adapter below), integrations[], accuracy_target,
  trigger (webhook|poll|cron|manual), volume_estimate, human_gate (where approval sits).
- \`docs/process-map.md\` — the manual task being replaced.
- \`docs/acceptance.md\` — success criteria with numbers.
- \`docs/fixtures/\` — real historical inputs (anonymised). If < 20 fixtures exist,
  generate synthetic ones, mark SYNTHETIC, and flag in the PR that the accuracy
  bar must be re-proven on real data before go-live.

## Stack & conventions
- Template repo: \`ooh-automation-worker\` (Node 20 + TypeScript + pg-boss on Postgres,
  Dockerfile for Render worker). On client infra: match their runtime, same structure.
- Model policy: cheapest model that hits the accuracy bar — start claude-haiku for
  classification, claude-sonnet for drafting/extraction; record per-run model + tokens
  + cost into \`automation_runs\`.
- Every external write: idempotency key on input hash, retry with backoff, circuit
  breaker (3 consecutive failures → pause + alert).
- Secrets via env only. Dry-run mode is a first-class flag, not an afterthought.

## Order of operations
1. Read the context contract. Write \`docs/build-notes.md\` with the workflow diagram (mermaid).
2. Scaffold from template. Wire trigger (webhook with signature check / poller with cursor / cron).
3. Implement the AI step: system prompt in \`prompts/\` (versioned file, not inline string),
   few-shot from fixtures, STRICT JSON output schema, deterministic parser + zod validation,
   guard rails (length, enum, confidence threshold).
4. Build the eval harness: run all fixtures through, score vs expected, print accuracy table.
   Iterate prompt until the accuracy target is met. Commit eval results to \`docs/evals/\`.
5. Implement the action step (vendor API write-back) with idempotency + retries.
6. Notifications: success summary + failure alert to the configured Slack/email.
7. Shadow mode: run against the last 30 days of inputs WITHOUT writing; produce
   \`docs/evals/shadow-report.md\` (would-have-done vs human-did).
8. Verify: lint, typecheck, tests (including a replayed-webhook idempotency test), eval at target.
9. PR. Go-live (flipping dry_run=false) happens via config row, not code — note this in the runbook.
10. Write \`docs/runbook.md\`: pause switch, debug steps, how to extend, circuit-breaker reset.
${AUTOMATION_CONTRACT}
## Style adapters (apply exactly one, from projects.metadata.style)
__STYLES__

## Definition of done
- Eval accuracy at/above target on real fixtures (shadow report attached to PR).
- Idempotency proven by replay test. Circuit breaker tested (forced-failure test).
- Every run visible in automation_runs with model/tokens/cost.
- Operator can pause without us (documented + tested).
- 30-day fix window monitors registered.

## Non-goals
- No new database unless the workflow genuinely needs persistence beyond automation_runs.
- No web UI unless the operator needs one (most don't — the approval queue lives in the platform).
- No multi-step agentic loops if a single prompt + deterministic code suffices.
`,

  // ===========================================================
  web_app: `# Project handoff — Web app / SaaS MVP

You are building an MVP. Ship the smallest thing that closes the loop.

## Context contract (read before any code)
- \`projects.metadata\`: style (adapter below), tenancy, auth_providers[],
  billing_model (none|one_off|subscription|usage), ai_features[] (named prompt
  modules from the shared library: rag, inbox-triage, enrichment, summarise...).
- \`docs/product-statement.md\` + \`docs/scope.md\` (in/out list is law — when in doubt, OUT).

## Stack & conventions
- Default stack: Vite + React + Tailwind front, Node 20 + Fastify + Postgres API,
  pg-boss for jobs — all deployable on Render via render.yaml (web + worker + db).
  Next.js acceptable when SEO/SSR is a stated requirement.
- Auth: email/password + magic link via Resend; Google OAuth if listed. httpOnly
  cookie sessions. Roles in a \`users\`/\`memberships\` table.
- Every table tenant- or owner-scoped; authorization enforced in the API layer with
  isolation tests signed in as a second account (this replaces RLS — test it like RLS).
- Stripe per billing_model; webhook idempotent (event-id dedupe table).
- AI features: import from the shared prompt-module library; never re-implement RAG/triage from scratch.

## Order of operations
1. Read context contract. Write \`docs/build-notes.md\` + ER diagram (mermaid).
2. Migration 001: schema + indexes + seed. Migration runner wired to preDeploy on Render.
3. Auth flows end-to-end (sign up, sign in, magic link, reset, invite if multi-user).
4. App shell: layout, nav, role gates, empty states designed (not placeholder text).
5. Primary entity CRUD → then secondary flows. Each flow gets a Playwright smoke test.
6. AI features from metadata.ai_features wired via the module library, each with an eval fixture set.
7. Billing if scoped: checkout, webhook, plan gating middleware, customer portal link.
8. Polish: onboarding to first value < 60s, mobile pass, error/loading states everywhere.
9. render.yaml: web + api + worker + database + preview env config. Deploy to staging.
10. Verify: lint, typecheck, unit + Playwright suites, isolation tests, webhook replay test.
${AUTOMATION_CONTRACT}
## Style adapters (apply exactly one, from projects.metadata.style)
__STYLES__

## Definition of done
- New user signs up → first value in < 60 seconds (timed in a Playwright test).
- Isolation tests pass with a second account (cross-tenant reads/writes all denied).
- Stripe webhook idempotent (replay test). Test charge succeeds in staging.
- Mobile-ready verified on real-device viewport profiles.
- render.yaml deploys clean from scratch (tested by deleting + re-syncing the blueprint on staging).

## Non-goals
- No premature optimisation (no Redis, no microservices, no GraphQL).
- No infinite-scroll if pagination works. No design-system rebuild — tokens + Tailwind.
- Nothing from the OUT list of docs/scope.md, even if trivially easy.
`,

  // ===========================================================
  custom_software: `# Project handoff — Custom internal software

You are building bespoke internal tooling. Optimise for the operator, not for resale.

## Context contract (read before any code)
- \`projects.metadata\`: style (adapter below), workflow_dag (JSON of the audited
  workflow), existing_tools[] (integrate vs replace decisions), operator_personas[].
- \`docs/process-map.md\` — annotated from the shadowing session. This is the spec.
- \`docs/constraints.md\` — systems we must integrate with, auth requirements, hosting constraints.

## Stack & conventions
- Pick the lightest thing the client can run: usually Vite/React + Node + Postgres on
  Render; sometimes a single-service app with server-rendered views. Match client
  hosting constraints if they exist.
- Auth: company SSO if they have it; otherwise email+password gated to their domain.
- Build around THEIR entities and vocabulary — table and field names should match the
  words operators use out loud.
- Integrations via their existing APIs/SDKs; never introduce a new SaaS without sign-off.

## Order of operations
1. Read context contract. Re-state the operator journey in \`docs/build-notes.md\`;
   if it contradicts process-map.md, stop — [NEEDS HUMAN].
2. Data model from the real entities. Migration + seed with realistic sample data.
3. Operator daily-driver views FIRST (the screens used hourly), keyboard-first.
4. Integrations: live data flowing from their systems, cursor-based incremental sync, sync-health visible.
5. Manager/reporting views second.
6. Pilot tooling: feature flag for parallel-run, feedback widget writing to a feedback table.
7. Verify: lint, typecheck, tests; seed-to-working-screen demo script in docs.
8. Runbook + training doc auto-drafted; rollout plan with cutover checklist.
${AUTOMATION_CONTRACT}
## Style adapters (apply exactly one, from projects.metadata.style)
__STYLES__

## Definition of done
- The operator completes their core task measurably faster (pilot timing recorded).
- Old process retired or parallel-run scheduled with a cutover date.
- A second team member can run the tool from the runbook alone.
- Sync health (if integrations) visible without opening logs.

## Non-goals
- No public-facing UI unless explicitly scoped. No new auth if SSO exists.
- No "configurable for the future" — build what they need now.
`,

  // ===========================================================
  platform: `# Project handoff — Full platform (multi-tenant)

You are building a multi-tenant platform. Tenancy and billing are first-class from day one.

## Context contract (read before any code)
- \`projects.metadata\`: style (adapter below), tenancy ADR inputs, role_matrix,
  billing_model, integration list.
- \`docs/business-model.md\`, \`docs/loops.md\`, \`docs/role-matrix.md\`.

## Stack & conventions
- Stack: Vite/Next + Node API + Postgres (row-level multi-tenant) + Stripe Billing +
  Resend. render.yaml: web, api, worker, cron, database, previews enabled.
- tenant_id on EVERY tenant-owned table; authorization middleware resolves tenant
  from session and scopes every query; isolation tests are part of CI, red-team style.
- Cross-tenant admin queries only through explicit admin endpoints with audit logging.
- Usage metering table from day one. Audit log from day one. Feature flags per plan.

## Order of operations
1. Read context contract. Write \`docs/adr/0001-tenancy.md\`.
2. Migration 001: tenants, users, memberships, invites + every core entity with tenant_id.
3. Auth + onboarding: sign up creates tenant; invite-by-email; role gates.
4. Billing surface early: Stripe products/prices sync script, plan gating middleware,
   billing portal, webhooks (idempotent), dunning states.
5. Primary loop end-to-end before ANY secondary surface.
6. Secondary: notifications, settings, admin, integrations.
7. Observability before beta: error tracking, product analytics events, audit log UI.
8. Isolation red-team suite: scripted attempts to read/write across tenants in every
   endpoint — all must fail. This suite is a permanent CI gate.
9. render.yaml deploy; preview envs per PR; staging seeded with 3 demo tenants.
10. Closed-beta tooling: invite gating, feedback widget, weekly release-notes draft automation.
${AUTOMATION_CONTRACT}
## Style adapters (apply exactly one, from projects.metadata.style)
__STYLES__

## Definition of done
- New tenant: sign up → invite teammate → complete primary loop → correctly billed, no human help.
- Isolation red-team suite green in CI.
- Usage metering recording; audit log capturing admin + billing actions.
- One full release cycle demonstrated (build → ship → measure → iterate).

## Non-goals
- No "we'll add multi-tenancy later". No premature internal admin tooling — SQL is fine pre-beta.
- No marketing site coupled to the platform — separate service.
`,

  // ===========================================================
  maintenance: `# Project handoff — Maintenance retainer request

You are executing one request in a retainer cycle on an existing production codebase.
Smallest correct change wins. You are a guest in this codebase — match its patterns.

## Context contract (read before any code)
- The feature_request (title, description, priority) + its scope from the orchestrator.
- \`projects.repo_url\`, \`projects.metadata\`: style (adapter below — usually set by
  the auto-classifier), on_call, health_status, deploy notes.
- The repo's own conventions: read README, recent commits, existing test patterns FIRST.

## Conventions
- Touch the minimum surface. No drive-by refactors, no dependency bumps unless that IS the request.
- Every bugfix ships with the regression test that would have caught it.
- Changelog entry drafted for client-visible changes (the platform posts it on merge).
- SLA: scoped same working day; low-risk shipped within 48h.

## Order of operations
1. Reproduce / verify the request against the live or staging environment.
2. Classify (or confirm the auto-classified) style adapter; set risk class honestly.
3. Implement smallest correct change. Tests. Verify full suite — never disable tests to pass.
4. PR with before/after evidence (screenshots for UI, logs/metrics for backend, EXPLAIN for queries).
5. On merge: Render auto-deploys; smoke tests run; activity event + changelog + Slack ping fire automatically.
${AUTOMATION_CONTRACT}
## Style adapters (apply exactly one — usually auto-classified)
__STYLES__

## Definition of done
- Request's acceptance criteria met with evidence in the PR.
- Full test suite green; new regression test where applicable.
- Risk class honest; auto-merge only if low-risk AND diff-classifier agrees.
- Client-visible change has a changelog draft.

## Non-goals
- No scope creep ("while I'm here..." is how retainers die). No pattern migrations.
- No infra changes unless that is the request.
`,

  // ===========================================================
  aiseo: `# Project handoff — AISEO programme work

You are executing Generative Engine Optimisation work. White-hat only: schema,
llms.txt, authority content, citations, monitoring. NEVER hidden text, prompt
injection, cloaking, or crawler manipulation — these are brand-destroying and banned.

## Context contract (read before any code)
- \`aiseo_subscriptions\` row: tier (foundation|authority), questions[30], engines[],
  site URL, client branding.
- \`projects.metadata\`: niche, voice_guide, competitors[], style (adapter below).
- Latest \`aiseo_audits\` row for the domain — the fix list is your work queue.

## Conventions
- Every change measurable: re-run the 14-axis audit after foundation work; attach
  before/after scores. Rankings tracked monthly via the ranker job.
- Schema generated FROM real page content — never fabricate reviews, ratings, or claims.
- Authority articles: question-led H1, answer-first opening, stats with linked primary
  sources, FAQ block, Article + Person schema. Written to be the source LLMs cite.
- Citation pitches are drafts for human approval — humans own relationships and sending.

## Order of operations (per style adapter)
1. Read the context contract + latest audit. Write the work plan into the run notes.
2. Execute per style adapter below.
3. Verify: audit re-run (foundation), schema validation, link checks (authority),
   baseline ranking pull (monitoring-setup).
4. PR / change pack with before/after evidence. Client-repo PRs are ALWAYS [NEEDS HUMAN].
${AUTOMATION_CONTRACT}
## Style adapters (apply exactly one)
__STYLES__

## Definition of done
- Foundation: audit grade A; all schema validates; llms.txt + robots correct.
- Authority: 3 articles committed + approved; 5 pitches drafted into the approval queue.
- Monitoring: baseline rankings recorded for all questions × engines; alerts configured;
  first report rendered and delivered.

## Non-goals
- No grey-hat, ever. No content farms. No fabricated statistics or testimonials.
- No promising specific rankings to clients in any generated copy.
`,

  // ===========================================================
  lead_engine: `# Project handoff — Lead engine (client onboarding / campaign work)

You are configuring or extending the autonomous lead engine for a client. The engine
is shared multi-tenant infrastructure — your work is rows + prompts + adapters, NOT
new pipeline code (a new pipeline feature is a platform feature_request instead).

## Context contract (read before any code)
- \`lead_icps\` (prompt, rules JSONB, channels, acceptance threshold), \`lead_sources\`
  (enabled, config), \`outreach_campaigns\` (voice_prompt, send_rate_per_day,
  approval_mode), suppression list, client writing samples in the document room.
- \`projects.metadata\`: style (adapter below), sending domain, warm-up state.

## Hard compliance rules (UK)
- B2B only: corporate roles at companies matching the ICP. No consumer (PECR).
- Every email: real sender identity, working unsubscribe, honoured globally within
  the platform (suppression at draft AND send time).
- approval_mode=manual for any new ICP/campaign until 500+ sends with stable acceptance.
- Bounce/complaint webhooks must be live BEFORE the first send. Complaint → suppress + alert.

## Order of operations
1. Read context contract. Validate config completeness; missing items → [NEEDS HUMAN] list.
2. Execute per style adapter below.
3. Dry-run the affected pipeline stage(s) and attach evidence (sampled leads + scores,
   rendered drafts, DNS check results) to the PR / run notes.
4. Verify: adapter tests green; compliance checklist in the PR body ticked item by item.
${AUTOMATION_CONTRACT}
## Style adapters (apply exactly one)
__STYLES__

## Definition of done
- icp-onboarding: human/LLM score agreement 80%+ on a 30-lead sample; rules map to real adapter params.
- campaign-launch: voice approved; sequence renders with real signals; warm-up schedule live; manual mode on.
- source-adapter: fixture tests green; 50-candidate QA pass recorded; disabled until QA sign-off.
- deliverability: SPF/DKIM/DMARC verified; webhooks tested; report job scheduled.

## Non-goals
- No consumer targeting. No purchased lists. No scraping that violates source ToS.
- No auto-mode on fresh ICPs regardless of how good the drafts look.
`,
};

// Inject style adapters into each handoff's __STYLES__ placeholder so the
// DB-stored handoff (and the admin copy button) carries everything.
for (const type of Object.keys(CLAUDE_HANDOFFS)) {
  const styles = STYLE_ADAPTERS[type];
  const block = styles
    ? Object.values(styles).join('\n\n')
    : '_No style adapters defined for this type yet._';
  CLAUDE_HANDOFFS[type] = CLAUDE_HANDOFFS[type].replace('__STYLES__', block);
}

// Compose the final worker prompt for a given project: base handoff + the
// single active style adapter (re-stated as ACTIVE) + per-project context block.
// Used by the orchestrator's build stage; safe to call from Node or browser.
const buildHandoff = (type, style, context = {}) => {
  const base = CLAUDE_HANDOFFS[type];
  if (!base) return null;
  const lines = [base.trim()];
  if (style && STYLE_ADAPTERS[type] && STYLE_ADAPTERS[type][style]) {
    lines.push(
      '\n---\n\n## ACTIVE STYLE FOR THIS PROJECT: ' + style +
      '\n\nThe adapter below is the one that applies. Ignore the other adapters listed above.\n\n' +
      STYLE_ADAPTERS[type][style]
    );
  }
  const entries = Object.entries(context).filter(([, v]) => v != null && v !== '');
  if (entries.length) {
    lines.push(
      '\n---\n\n## PROJECT CONTEXT\n\n' +
      entries.map(([k, v]) => '- **' + k + '**: ' + (typeof v === 'string' ? v : JSON.stringify(v))).join('\n')
    );
  }
  return lines.join('\n');
};

const findTemplate = (type, name) =>
  PLAN_TEMPLATES.find(p => p.type === type && (!name || p.name === name));

module.exports = { PLAN_TEMPLATES, CLAUDE_HANDOFFS, STYLE_ADAPTERS, AUTOMATION_CONTRACT, buildHandoff, findTemplate };
