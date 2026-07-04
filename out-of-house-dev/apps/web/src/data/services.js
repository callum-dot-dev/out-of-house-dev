// Source of truth for the six services we sell.
// - Home page services accordion consumes `accordion` shape.
// - Header dropdown consumes `nav` shape.
// - /services/:slug detail page consumes the full record.

export const SERVICES = [
  {
    slug: 'ai-automations',
    title: 'AI automations',
    flag: 'Flagship',
    navCaption: 'Custom AI workflows on your stack',
    accordion: `Our flagship offering. We design and deploy <strong>custom AI automations</strong> that take repetitive, time-draining work off your team's plate: <strong>inbox triage, document processing, internal copilots, CRM enrichment, support agents</strong>, and bespoke multi-step workflows. Integrated with the systems you already use (Slack, Notion, HubSpot, Gmail, Stripe, Airtable, your own APIs). Most automations are scoped on a call, built, and live <strong>within days, not months</strong>.`,
    hero: {
      eyebrow: 'Flagship service',
      title: 'Custom AI automations, shipped in days.',
      accent: 'shipped in days',
      lead: `We design and deploy bespoke AI workflows that take the most time-draining work off your team's plate. Scoped on a call, built fast, integrated into the tools you already use, and live in production with the rails to stay reliable.`,
      proofPoints: [
        { kicker: 'Live', value: 'in days' },
        { kicker: 'Senior eng', value: 'on every build' },
        { kicker: 'You own', value: 'the code + infra' },
      ],
    },
    offer: {
      eyebrow: 'What we build',
      title: 'Real automations we ship every week.',
      items: [
        { title: 'Inbox triage agents',         body: 'Classify, route, and draft replies to inbound email. Sales, support, ops — pick the inbox, we wire the agent.' },
        { title: 'Document processing',         body: 'PDFs, invoices, forms, contracts — extract the structured data, write it to your systems, flag the edge cases for a human.' },
        { title: 'Internal copilots',           body: 'RAG-grounded Q&A over your docs, wiki, and SOPs. With citations, so the answers are checkable.' },
        { title: 'CRM enrichment',              body: 'Lookup, enrich, and write structured data to HubSpot, Salesforce, Pipedrive, or whatever you run. No more manual paste.' },
        { title: 'Support agents',              body: 'Front-line response with escalation logic. Routes the easy stuff, gets the hard stuff to a human with full context.' },
        { title: 'Multi-step workflow agents',  body: 'Cross-system orchestration: watches Stripe, tags customers, posts to Slack, opens a Linear issue. Whatever the chain, we wire it.' },
      ],
    },
    process: {
      eyebrow: 'How it works',
      title: 'A call. A scope. Working AI, fast.',
      steps: [
        { num: '01', label: 'Day 0',     title: '30-minute scoping call',        body: 'We learn your process, the tools involved, and what success looks like. No questionnaires.' },
        { num: '02', label: 'Day 0–1',   title: 'Written scope + fixed price',   body: 'Within 24 hours: scope, acceptance criteria, fixed price, and a delivery date.' },
        { num: '03', label: 'Day 1–7',   title: 'Build sprint',                   body: 'Senior engineers ship working slices daily. Direct Slack access, real progress every day.' },
        { num: '04', label: 'Go live',   title: 'Connected to your stack',        body: 'We wire it into Slack, Notion, HubSpot, Gmail, Stripe, Airtable, or your APIs — whatever you run.' },
        { num: '05', label: 'Production', title: 'Evals + traces from day one',   body: 'Every run is logged and scored. If the agent drifts, you see it before your users do.' },
      ],
    },
    deliverables: {
      eyebrow: 'What you get',
      title: 'Owned, observable, in production.',
      items: [
        'Working automation in production, integrated into your stack',
        'Source code in your repo — no platform lock-in',
        'Eval suite so quality is measurable and trackable',
        'Full observability: traces, logs, replays of every run',
        'Documentation for your team to operate and extend it',
        '30 days of post-launch fixes included',
      ],
    },
    cta: { primary: 'Book a discovery call', secondary: 'See pricing' },
  },

  {
    slug: 'ai-growth',
    title: 'AI growth and lead engine',
    flag: 'New',
    navCaption: 'Find leads, run outreach, post AI content',
    accordion: `AI that brings you customers, not just processes them. We build workflows that <strong>identify your ideal-fit accounts</strong>, surface buying signals from public data, draft <strong>personalised outreach at scale</strong> in your voice, and run <strong>AI-driven social and content</strong> campaigns that engage the right people at the right time. Plugged into your CRM, your inbox, and your calendar. For founders who need pipeline before they can afford an SDR team — and for sales teams who want their reps spending time on calls, not on lists.`,
    hero: {
      eyebrow: 'Growth service',
      title: 'A pipeline engine, not just a process for it.',
      accent: 'pipeline engine',
      lead: `AI that finds your ideal customers, enriches them with intent data, drafts personalised outreach in your voice, and runs AI social campaigns that engage the right people. Built for founders who need pipeline before they can afford an SDR team.`,
      proofPoints: [
        { kicker: 'No SDRs',   value: 'required' },
        { kicker: 'Plugs in',  value: 'to your CRM' },
        { kicker: 'Booked',    value: 'meetings, not lists' },
      ],
    },
    offer: {
      eyebrow: 'What we build',
      title: 'The full pipeline, automated end to end.',
      items: [
        { title: 'Ideal customer profile modeling', body: 'We turn your best closed-won deals into a working ICP. The model knows what to look for and ignores the rest.' },
        { title: 'Lead discovery',                  body: 'Surface ideal-fit companies from public data: LinkedIn, news, hiring signals, tech stack, funding announcements.' },
        { title: 'Buying signal enrichment',        body: 'Layer intent data on top: who is hiring, who just raised, who just adopted a competitor. Timing is half the battle.' },
        { title: 'Personalised outreach drafts',    body: 'AI drafts each message based on the lead, the signal, and your voice. You review, send, or push to your sequencer.' },
        { title: 'AI social and content',           body: 'A posting engine that learns what your audience engages with and ships content on a schedule. LinkedIn, X, blog, repurposed across.' },
        { title: 'Inbox-side meeting booker',       body: 'An agent that handles the calendar ping-pong. Routes the convo, books the time, briefs your rep before the call.' },
      ],
    },
    process: {
      eyebrow: 'How it works',
      title: 'From ICP to booked meetings, in four stages.',
      steps: [
        { num: '01', label: 'Week 0',  title: 'ICP + audit',         body: 'We map your best customers, your current pipeline, and the tools you use. Out comes a target persona and a discovery plan.' },
        { num: '02', label: 'Week 1',  title: 'Build the pipeline',  body: 'Lead discovery agents + enrichment + outreach drafting wired into your CRM, your inbox, and your calendar.' },
        { num: '03', label: 'Week 2',  title: 'Test on real leads',  body: 'We run it against real prospects, measure reply rate and conversion, and tune the drafts until they sound like you.' },
        { num: '04', label: 'Ongoing', title: 'Run + optimise',      body: 'Monthly tuning. We watch what is working, what is not, and reshape the prompts, the lists, and the cadence accordingly.' },
      ],
    },
    deliverables: {
      eyebrow: 'What you get',
      title: 'A working growth engine, not a slide deck.',
      items: [
        'A lead pipeline writing into your CRM every day',
        'Personalised outreach drafts prepped for review or auto-send',
        'AI social posting on a schedule you control',
        'A meeting-booking agent on your inbox',
        'A dashboard with reply rate, conversion, and pipeline velocity',
        'Monthly tuning to keep the engine producing',
      ],
    },
    cta: { primary: 'Book a growth call', secondary: 'See pricing' },
  },

  {
    slug: 'websites',
    title: 'Websites and landing pages',
    navCaption: 'Same-day marketing sites',
    accordion: `High-converting <strong>marketing sites</strong> and <strong>landing pages</strong>, designed with intent and built to load fast. Modern stack, modern hosting, and a delivery process that can take a brief through to <strong>a live site the same day you talk to us</strong>. SEO, analytics, and CMS integration included. We host it for you for £100 a month so you never have to think about it again.`,
    hero: {
      eyebrow: 'Marketing site',
      title: 'A real website, live the same day.',
      accent: 'live the same day',
      lead: `Modern marketing sites and landing pages, designed with intent and built to load fast. Brief us in the morning, see it live by the evening. SEO, analytics, and a CMS if you want one.`,
      proofPoints: [
        { kicker: 'Live',        value: 'same day' },
        { kicker: '£100/mo',     value: 'hosting included' },
        { kicker: 'You own',     value: 'the source' },
      ],
    },
    offer: {
      eyebrow: 'What we ship',
      title: 'Every flavour of marketing site.',
      items: [
        { title: 'Starter sites (1–5 pages)',     body: 'Local businesses and solo founders. Mobile-perfect, SEO-ready, contact form, hosted for you.' },
        { title: 'Marketing sites (5–15 pages)',  body: 'Multi-section sites with case studies, pricing, blog, careers. Built around your funnel.' },
        { title: 'Landing pages',                  body: 'Single high-conversion pages for campaigns. A/B variants if you want them.' },
        { title: 'Page redesigns',                 body: 'Take a tired page and rebuild it for conversion. Often live within 24 hours.' },
        { title: 'CMS integration',                body: 'Sanity, Contentful, or a custom admin. So your team can ship copy without a developer.' },
        { title: 'Hosting on us',                  body: '£100 a month. Updates, backups, SSL, uptime monitoring. You never think about it.' },
      ],
    },
    process: {
      eyebrow: 'How it works',
      title: 'Brief to live, in a single day.',
      steps: [
        { num: '01', label: '30 min', title: 'Brief call',         body: 'You tell us the business, the audience, the action you want them to take. We sketch the structure on the call.' },
        { num: '02', label: '24 h',   title: 'Scope and quote',    body: 'You get a fixed price and a delivery time. Often the answer is "by end of day".' },
        { num: '03', label: 'Same day', title: 'Live build',       body: 'You watch progress in real time. Copy, design, animations, hosting — assembled live.' },
        { num: '04', label: 'Live',   title: 'Hosted and cared for', body: 'We push it to production, set up DNS, wire analytics, and look after it for you on a £100/month plan.' },
      ],
    },
    deliverables: {
      eyebrow: 'What you get',
      title: 'A site, the code, and someone watching it.',
      items: [
        'A live, hosted, SSL-secured marketing site',
        'All source code in your repo',
        'Analytics + search console + SEO basics configured',
        'CMS access for your team if applicable',
        'Monthly care: updates, backups, uptime',
        'Cancel hosting anytime — the site is yours',
      ],
    },
    cta: { primary: 'Brief us today', secondary: 'See pricing' },
  },

  {
    slug: 'web-apps',
    title: 'Web apps and SaaS products',
    navCaption: 'MVPs and full products',
    accordion: `Full <strong>web application</strong> and <strong>SaaS</strong> builds: auth, billing, dashboards, multi-tenant logic, AI features baked in where they matter. We start with a call to understand exactly what you need, then ship MVPs in <strong>weeks instead of quarters</strong>, at a quality level that holds up to real users.`,
    hero: {
      eyebrow: 'Product engineering',
      title: 'MVPs in weeks. Real products, not demos.',
      accent: 'Real products, not demos',
      lead: `Full web application and SaaS builds: auth, billing, multi-tenant, AI features baked in where they matter. MVPs from £4,000, shipped in weeks instead of quarters, at a quality level that holds up to real users. Need something rougher first? Same-day prototypes ride our website and automation price points (from £500) — ask on the call.`,
      proofPoints: [
        { kicker: 'MVPs',     value: 'from £4,000' },
        { kicker: 'Senior',   value: 'eng only' },
        { kicker: 'Yours',    value: 'on day one' },
      ],
    },
    offer: {
      eyebrow: 'What we build',
      title: 'From first-release MVP to multi-tenant SaaS.',
      items: [
        { title: 'MVP builds',                body: 'A working product in 1–4 weeks. The slice your founding customers can actually use, not a Figma file.' },
        { title: 'Full SaaS products',        body: 'Auth, billing, roles, admin, multi-tenant data. The unglamorous plumbing that makes a real product.' },
        { title: 'AI features',               body: 'RAG, agents, multimodel routing, evals, traces — baked into the product where they earn their place.' },
        { title: 'Mobile-first PWAs',         body: 'Installable, offline-capable, fast. When you do not need an app store, you do not need an app.' },
        { title: 'White-label + embeddable',  body: 'Widgets, embeds, and white-label experiences. For when your product lives inside someone else\'s.' },
        { title: 'Migrations + rewrites',     body: 'The legacy app that is bleeding money. We assess, scope, and rebuild in modern stack.' },
      ],
    },
    process: {
      eyebrow: 'How it works',
      title: 'A scope, an architecture, then weekly working slices.',
      steps: [
        { num: '01', label: '60 min',   title: 'Discovery call',       body: 'We dig into the product, the users, the business model, the constraints. The output is shared understanding, not a brief.' },
        { num: '02', label: '24–48 h', title: 'Architecture + price',  body: 'A written tech architecture, a fixed price, a delivery plan, and a definition-of-done you can sign.' },
        { num: '03', label: 'Weekly', title: 'Iterative shipping',     body: 'A working slice every 2–3 days. Direct Slack access. You see real progress, no black-box waits.' },
        { num: '04', label: 'Launch', title: 'Hardened for users',     body: 'Eval suite, monitoring, CI/CD, IaC. We hand over a product that survives meeting its users.' },
      ],
    },
    deliverables: {
      eyebrow: 'What you get',
      title: 'A product in production, not a prototype.',
      items: [
        'A live, production-grade web app',
        'Source code in your repo with CI/CD and infra-as-code',
        'Auth, billing, admin, observability — the boring parts done right',
        'Eval and test suites for any AI features',
        'Architecture and ops documentation',
        '30 days of post-launch fixes included',
      ],
    },
    cta: { primary: 'Scope a product', secondary: 'See pricing' },
  },

  {
    slug: 'internal-tools',
    title: 'Custom internal software',
    navCaption: 'Bespoke tools and dashboards',
    accordion: `Bespoke <strong>internal tools</strong>, dashboards, and operations software built around how <em>your</em> business actually runs. Replace the spreadsheets, the manual handoffs, and the SaaS subscriptions that almost-fit. We integrate with your existing stack and ship working software faster than you'd expect.`,
    hero: {
      eyebrow: 'Internal software',
      title: 'Software shaped to your business, not the other way round.',
      accent: 'shaped to your business',
      lead: `Bespoke tools, dashboards, and operations software built around how your business actually runs. Replace the spreadsheets, the manual handoffs, and the SaaS subscriptions that almost-fit.`,
      proofPoints: [
        { kicker: 'Replaces',  value: 'the spreadsheets' },
        { kicker: 'Integrates', value: 'with everything' },
        { kicker: 'Cheaper',    value: 'than 5 SaaS subs' },
      ],
    },
    offer: {
      eyebrow: 'What we build',
      title: 'The operational software your team needs to actually exist.',
      items: [
        { title: 'Replace spreadsheet workflows', body: 'The Google Sheet that runs your business — promoted into real software, with permissions, history, and a UI your team will use.' },
        { title: 'Dashboards and reporting',     body: 'Bring data together from across your stack. Live dashboards your leadership team actually opens.' },
        { title: 'Operations management',         body: 'The day-to-day system your operators live in: job assignment, scheduling, status tracking, escalation.' },
        { title: 'Multi-system integrators',      body: 'When five tools need to stay in sync, we build the layer that does it. No more daily reconciliation.' },
        { title: 'Admin panels',                  body: 'Custom admin interfaces — Retool, but yours. Made to fit your data model and your team\'s workflow.' },
        { title: 'AI-augmented processes',         body: 'Where the process needs judgement, we add an AI assistant that drafts, classifies, or flags. Human stays in charge.' },
      ],
    },
    process: {
      eyebrow: 'How it works',
      title: 'We learn the workflow, then we replace it.',
      steps: [
        { num: '01', label: 'Week 0', title: 'Workflow audit',     body: 'We sit with your operators and map what they do today. Tools, handoffs, pain points, edge cases.' },
        { num: '02', label: 'Week 0–1', title: 'Architecture',      body: 'Which tools we replace, which we integrate with, which we leave alone. A fixed-price proposal, signed off before we build.' },
        { num: '03', label: 'Weekly', title: 'Build with operators', body: 'We demo every week to the people who will use the tool. Their feedback steers the build.' },
        { num: '04', label: 'Launch', title: 'Roll-out + training',  body: 'We help the team migrate, train the first power users, and stick around for the inevitable "can it also do X?".' },
      ],
    },
    deliverables: {
      eyebrow: 'What you get',
      title: 'A tool your operators actually use.',
      items: [
        'A working internal tool, owned and hosted by you',
        'Integrations with the systems you already run',
        'A team training session before launch',
        'Admin documentation and runbooks',
        'Source code and infra in your repo',
        '30 days of post-launch fixes included',
      ],
    },
    cta: { primary: 'Audit your workflow', secondary: 'See pricing' },
  },

  {
    slug: 'maintenance',
    title: 'Ongoing growth and maintenance',
    navCaption: 'Continuous shipping engagement',
    accordion: `Once you're live, we keep things moving: <strong>feature iteration, performance optimisation, security patching</strong>, and continuous improvement of your AI automations as your processes evolve. Flexible monthly engagement, pause or scale at any time.`,
    hero: {
      eyebrow: 'Ongoing engagement',
      title: 'A senior team on tap, paused or scaled when you need.',
      accent: 'paused or scaled when you need',
      lead: `Once you are live, we keep things moving: feature iteration, performance, security, and continuous improvement of your AI as processes evolve. Flexible monthly engagement, pause or scale at any time.`,
      proofPoints: [
        { kicker: 'Cycles',  value: 'every 2–3 days' },
        { kicker: 'Direct',  value: 'Slack access' },
        { kicker: 'Pause',   value: 'any month' },
      ],
    },
    offer: {
      eyebrow: 'What we cover',
      title: 'Continuous shipping, not a parked retainer.',
      items: [
        { title: 'Feature iteration',         body: 'Working slices every 2–3 days. The new functionality your customers asked for, in their hands this week.' },
        { title: 'Performance optimisation',   body: 'Slow pages, slow queries, slow AI calls — we profile, fix, and watch the metrics improve.' },
        { title: 'Security patching',          body: 'Dependency updates, vulnerability monitoring, secret rotation. The work that quietly stops bad days happening.' },
        { title: 'AI tuning and eval drift',   body: 'Models change. Your data changes. Your evals catch it; we retune, redeploy, and keep the quality bar where it should be.' },
        { title: 'Bug fixes and ops',          body: 'When something breaks, we are on it. Direct Slack channel, no ticket portal.' },
        { title: 'On-call response',           body: 'Optional. For products that need a human watching them after hours.' },
      ],
    },
    process: {
      eyebrow: 'How it works',
      title: 'Pick a tier. Start this week. Pause anytime.',
      steps: [
        { num: '01', label: 'Tier',    title: 'Choose a monthly scope', body: 'Care (from £100/month, by product type) keeps a finished build healthy. Retainers add continuous delivery: Light £1,500 — one active workstream, weekly ship cycle. Standard £2,500 — 2–3 day cycles across two workstreams. Heavy £4,000 — multiple workstreams plus on-call. Pause or switch tier any month.' },
        { num: '02', label: 'Slack',   title: 'Direct channel',         body: 'A shared Slack channel with the engineers doing the work. No account manager in the middle.' },
        { num: '03', label: 'Cycles',  title: '2–3 day shipping cycles', body: 'Working slices ship continuously. You review, redirect, prioritise as you go.' },
        { num: '04', label: 'Optional', title: 'Pause or cancel',        body: 'Quiet month? Pause the engagement. Need more? Scale the tier. No lock-in.' },
      ],
    },
    deliverables: {
      eyebrow: 'What you get',
      title: 'Continuous progress, fully visible.',
      items: [
        'A monthly summary of what shipped and what is queued',
        'Direct Slack access to the engineers doing the work',
        'Continued maintenance of any eval and test suites',
        'A roadmap kept in sync with your priorities',
        'First-month money-back guarantee',
        'Pause or cancel any month, no exit fees',
      ],
    },
    cta: { primary: 'Start a retainer', secondary: 'See pricing' },
  },
];

export const SERVICE_INDEX = Object.fromEntries(SERVICES.map((s, i) => [s.slug, i]));

export const getServiceBySlug = (slug) => SERVICES.find((s) => s.slug === slug);
