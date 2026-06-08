// Idempotent seed. Running twice changes nothing (ON CONFLICT / where-not-exists
// guards everywhere). Ports scripts/seed.js and adds the v4 seed data.
//   tsx db/seeds/seed.ts
import { join } from 'node:path';
import { Client } from 'pg';
import { hash } from '@node-rs/argon2';

// planTemplates.js is CommonJS — require it directly (the canonical prompt pack).
// Dynamic path keeps tsx/esbuild from trying to bundle it.
const planTemplatesPath = join(__dirname, '..', '..', 'apps', 'web', 'src', 'data', 'planTemplates.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PLAN_TEMPLATES, CLAUDE_HANDOFFS } = require(planTemplatesPath) as {
  PLAN_TEMPLATES: Array<{ type: string; name: string; summary: string; phases: unknown }>;
  CLAUDE_HANDOFFS: Record<string, string>;
};

const DEMO_USERS = [
  {
    email: process.env.SEED_ADMIN_EMAIL ?? 'callum.saxon@elevatesl.co.uk',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'change-me-after-seeding',
    full_name: 'Callum Saxon',
    role: 'admin',
    company: 'out-of-house.dev',
  },
  { email: 'demo.developer@out-of-house.dev', password: 'demo-developer-2026', full_name: 'Demo Developer', role: 'developer', company: 'out-of-house.dev' },
  { email: 'demo.client@out-of-house.dev', password: 'demo-client-2026', full_name: 'Demo Client', role: 'client', company: 'Acme Coffee Roasters' },
];

const PROGRAMMES = [
  { slug: 'ai-fast-start-3w', audience: 'developer', name: 'AI Fast-Start (3 weeks)', tagline: 'Get fluent in Claude, MCP, and the AI-native stack.', duration_weeks: 3, price_gbp: 395, price_label: '£395', cert_difficulty: 'Foundation', certificate: true, flag: null, next_cohort: '2026-06-15', seats: 20 },
  { slug: 'ai-builder-6w', audience: 'developer', name: 'AI Builder Intensive (6 weeks)', tagline: 'Build and ship a portfolio AI automation with senior code review.', duration_weeks: 6, price_gbp: 795, price_label: '£795', cert_difficulty: 'Intermediate', certificate: true, flag: null, next_cohort: '2026-07-06', seats: 16 },
  { slug: 'ai-engineer-12w', audience: 'developer', name: 'AI / Automation Engineer (12 weeks)', tagline: 'Become a hireable AI engineer. Two real projects, certification, bench intro.', duration_weeks: 12, price_gbp: 1495, price_label: '£1,495', cert_difficulty: 'Professional', certificate: true, flag: 'Flagship', next_cohort: '2026-06-22', seats: 12 },
  { slug: 'business-ai-fast-3w', audience: 'business', name: 'Business AI Fast-Start (3 weeks)', tagline: 'One workflow audited, three automations live, your team trained.', duration_weeks: 3, price_gbp: 1500, price_label: '£1,500', cert_difficulty: null, certificate: false, flag: null, next_cohort: '2026-06-08', seats: 8 },
  { slug: 'business-ai-department-6w', audience: 'business', name: 'Build an AI Department (6 weeks)', tagline: 'Full workflow audit, prompt library, 3–5 automations in production.', duration_weeks: 6, price_gbp: 3500, price_label: '£3,500', cert_difficulty: null, certificate: false, flag: null, next_cohort: '2026-07-13', seats: 6 },
  { slug: 'business-ai-transformation-12w', audience: 'business', name: 'AI Business Transformation (12 weeks)', tagline: 'Internal copilot, 10+ automations, dashboards, on-call support.', duration_weeks: 12, price_gbp: 6500, price_label: '£6,500', cert_difficulty: null, certificate: false, flag: 'Flagship', next_cohort: '2026-08-03', seats: 4 },
];

const SAAS_APPS = [
  { slug: 'logovault', name: 'LogoVault', status: 'beta', tagline: 'Every company logo, every format, one API.', summary: 'AI-tagged logo library with SVG/PNG/JPG variants and an API for developers.' },
  { slug: 'prompt-locker', name: 'Prompt Locker', status: 'planned', tagline: 'Team prompt library + evals.', summary: 'Versioned prompt library, A/B testing, regression evals.' },
  { slug: 'inbox-fox', name: 'Inbox Fox', status: 'planned', tagline: 'Inbox triage agent as a service.', summary: 'Drop-in Gmail/Outlook inbox triage agent.' },
  { slug: 'fingerprint-fund', name: 'Fingerprint Fund', status: 'planned', tagline: 'Lead discovery for small agencies.', summary: 'Standalone version of our lead-discovery engine.' },
];

const LOGOVAULT_BRANDS = [
  ['stripe', 'Stripe', ['Stripe Inc', 'stripe.com'], 'stripe.com', '#635bff'],
  ['notion', 'Notion', ['Notion Labs', 'notion.so'], 'notion.so', '#000000'],
  ['supabase', 'Supabase', ['supabase.io'], 'supabase.com', '#3ecf8e'],
  ['anthropic', 'Anthropic', ['Claude', 'claude.ai'], 'anthropic.com', '#d97757'],
  ['openai', 'OpenAI', ['ChatGPT', 'openai.com'], 'openai.com', '#10a37f'],
  ['vercel', 'Vercel', ['vercel.com', 'Zeit'], 'vercel.com', '#000000'],
  ['github', 'GitHub', ['github.com'], 'github.com', '#181717'],
  ['linear', 'Linear', ['linear.app'], 'linear.app', '#5e6ad2'],
  ['figma', 'Figma', ['figma.com'], 'figma.com', '#f24e1e'],
  ['slack', 'Slack', ['slack.com'], 'slack.com', '#4a154b'],
] as const;

const LEAD_SOURCES = [
  ['google-places', 'Google Places', 'places', false, { radius_km: 50 }],
  ['companies-house', 'Companies House', 'companies_house', false, { incorporation_within_days: 365 }],
  ['yelp', 'Yelp', 'yelp', false, {}],
  ['reddit-aspirants', 'Reddit (career switchers)', 'reddit', false, { subreddits: ['learnprogramming', 'cscareerquestions', 'ExperiencedDevs', 'AIDevs'] }],
  ['linkedin', 'LinkedIn', 'linkedin', false, {}],
  ['news-funding', 'News (funding feeds)', 'news', false, {}],
] as const;

const LEAD_ICPS = [
  {
    name: 'UK SMB no website',
    description: 'UK small businesses with no or a poor website — prime for a same-day site + care plan.',
    prompt: 'Score this UK small business as a lead for a £500 website + £100/mo care plan. Higher score if: no website or a broken/builder-template site, active business, local service trade (trades, salon, clinic, cafe), findable contact. Lower if: large company, strong existing custom site, no contactable owner.',
    rules: { country: 'GB', website_status: ['none', 'broken', 'wix', 'squarespace', 'wordpress'] },
  },
  {
    name: 'UK aspiring AI engineer',
    description: 'UK developers wanting to switch into AI/automation engineering — course + coaching leads.',
    prompt: 'Score this person as a lead for our AI engineering courses (£395–£1,495) or 1:1 coaching. Higher score if: a working developer expressing interest in AI/automation, career-switch intent, asking how to learn Claude/agents/LLMs. Lower if: already a senior AI engineer, not a developer, or not UK-based.',
    rules: { country: 'GB', intent: ['career_switch', 'learn_ai'] },
  },
];

async function seedUser(c: Client, u: (typeof DEMO_USERS)[number]): Promise<string> {
  const passwordHash = await hash(u.password);
  const { rows } = await c.query<{ id: string }>(
    `insert into users (email, password_hash, full_name, role, company)
       values ($1, $2, $3, $4, $5)
     on conflict (email) do update
       set full_name = excluded.full_name, role = excluded.role, company = excluded.company
     returning id`,
    [u.email, passwordHash, u.full_name, u.role, u.company],
  );
  return rows[0].id;
}

async function seedPlanTemplates(c: Client): Promise<void> {
  for (const t of PLAN_TEMPLATES) {
    await c.query(
      `insert into plan_templates (type, name, summary, phases, claude_code_handoff)
         values ($1, $2, $3, $4, $5)
       on conflict (type, name) do update
         set summary = excluded.summary, phases = excluded.phases, claude_code_handoff = excluded.claude_code_handoff`,
      [t.type, t.name, t.summary, JSON.stringify(t.phases), CLAUDE_HANDOFFS[t.type] ?? ''],
    );
  }
}

async function seedProgrammes(c: Client): Promise<void> {
  for (const p of PROGRAMMES) {
    const { rows } = await c.query<{ id: string }>(
      `insert into programmes (slug, audience, name, tagline, duration_weeks, price_gbp, price_label, cert_difficulty, certificate, flag)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (slug) do update
         set name = excluded.name, price_gbp = excluded.price_gbp, certificate = excluded.certificate, flag = excluded.flag
       returning id`,
      [p.slug, p.audience, p.name, p.tagline, p.duration_weeks, p.price_gbp, p.price_label, p.cert_difficulty, p.certificate, p.flag],
    );
    const programmeId = rows[0].id;
    await c.query(
      `insert into cohorts (programme_id, start_date, capacity, status)
         values ($1, $2, $3, 'open')
       on conflict (programme_id, start_date) do nothing`,
      [programmeId, p.next_cohort, p.seats],
    );
  }
}

async function seedSaasApps(c: Client): Promise<void> {
  for (const s of SAAS_APPS) {
    await c.query(
      `insert into saas_apps (slug, name, status, tagline, summary) values ($1,$2,$3,$4,$5)
       on conflict (slug) do update set name = excluded.name, status = excluded.status, tagline = excluded.tagline, summary = excluded.summary`,
      [s.slug, s.name, s.status, s.tagline, s.summary],
    );
  }
}

async function seedLogovault(c: Client): Promise<void> {
  for (const [slug, name, aliases, domain, hex] of LOGOVAULT_BRANDS) {
    await c.query(
      `insert into logovault_brands (slug, display_name, aliases, primary_domain, hex_primary, source)
         values ($1,$2,$3,$4,$5,'simpleicons')
       on conflict (slug) do update set display_name = excluded.display_name, primary_domain = excluded.primary_domain, hex_primary = excluded.hex_primary`,
      [slug, name, aliases as unknown as string[], domain, hex],
    );
  }
}

async function seedLeadSources(c: Client): Promise<void> {
  for (const [slug, name, kind, enabled, config] of LEAD_SOURCES) {
    await c.query(
      `insert into lead_sources (slug, name, kind, enabled, config) values ($1,$2,$3,$4,$5)
       on conflict (slug) do nothing`,
      [slug, name, kind, enabled, JSON.stringify(config)],
    );
  }
}

async function seedLeadIcps(c: Client): Promise<void> {
  for (const icp of LEAD_ICPS) {
    await c.query(
      `insert into lead_icps (name, description, prompt, rules, channels, is_active)
       select $1, $2, $3, $4, array['email']::text[], true
       where not exists (select 1 from lead_icps where name = $1 and client_id is null)`,
      [icp.name, icp.description, icp.prompt, JSON.stringify(icp.rules)],
    );
  }
  // Default outreach campaign (manual approval, conservative warm-up rate).
  await c.query(
    `insert into outreach_campaigns (name, channel, voice_prompt, status, send_rate_per_day, approval_mode)
     select 'Default outreach', 'email',
            'Write like a senior engineer who has actually looked at their business: specific, warm, zero hype, one clear ask.',
            'draft', 20, 'manual'
     where not exists (select 1 from outreach_campaigns where name = 'Default outreach')`,
  );
}

async function seedOwnUptimeCheck(c: Client): Promise<void> {
  await c.query(
    `insert into uptime_checks (target_url, interval_s, enabled)
     select 'https://out-of-house.dev', 300, true
     where not exists (select 1 from uptime_checks where target_url = 'https://out-of-house.dev')`,
  );
}

async function seedDemoProject(c: Client, clientId: string, devId: string): Promise<void> {
  const existing = await c.query('select id from projects where client_id = $1 limit 1', [clientId]);
  if (existing.rowCount && existing.rowCount > 0) return;

  const { rows } = await c.query<{ id: string }>(
    `insert into projects (client_id, name, project_type, description, status, metadata)
       values ($1, 'Acme Coffee Roasters: Website refresh', 'website',
               'Modern marketing site for Acme Coffee Roasters. Hero, story, product grid, wholesale enquiry form. Same-day delivery target.',
               'building', '{"style":"brochure-local-smb"}'::jsonb)
     returning id`,
    [clientId],
  );
  const projectId = rows[0].id;

  const requests: Array<[string, string, string, string, string | null]> = [
    ['Hero copy + image direction', 'Lock the hero headline, sub, and pick a hero treatment (lifestyle vs product macro).', 'high', 'shipped', devId],
    ['Product grid with filters', 'Filterable product grid (origin, roast, bag size). Link each to the product page.', 'high', 'building', devId],
    ['Wholesale enquiry form', 'Form that captures company name, expected volume, email. Routes to founder inbox.', 'medium', 'scoped', null],
    ['Newsletter signup', 'Footer signup, posts to Mailchimp. Double opt-in.', 'low', 'submitted', null],
    ['Instagram feed embed', 'Latest 6 posts in a strip on the home page.', 'low', 'submitted', null],
  ];
  for (const [title, description, priority, status, claimedBy] of requests) {
    await c.query(
      `insert into feature_requests (project_id, created_by, title, description, priority, status, claimed_by)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [projectId, clientId, title, description, priority, status, claimedBy],
    );
  }

  const tpl = await c.query<{ id: string; phases: unknown }>(
    `select id, phases from plan_templates where type = 'website' limit 1`,
  );
  if (tpl.rowCount) {
    await c.query(
      `insert into project_plans (project_id, template_id, phases, current_phase_index, current_step_index)
       values ($1, $2, $3, 2, 1)`,
      [projectId, tpl.rows[0].id, JSON.stringify(tpl.rows[0].phases)],
    );
  }
}

async function seedDemoApplications(c: Client): Promise<void> {
  const { rows } = await c.query<{ n: string }>('select count(*)::int as n from applications');
  if (Number(rows[0].n) > 0) return;
  const apps: Array<[string, string, string, string, string, string, string, string]> = [
    ['Sara Lim', 'sara@northlight.studio', 'Northlight Studio', 'website', 'New marketing site for our photography studio. 5 pages, portfolio grid, contact form.', '£1,000 to £5,000', 'ASAP', 'Referral'],
    ['Marcus Webb', 'marcus@routerly.io', 'Routerly', 'automation', 'Need an automation that processes inbound sales emails: classify, draft reply, push to HubSpot.', '£5,000 to £20,000', 'Within a month', 'Search'],
    ['Priya Shah', 'priya@ledgerlift.co', 'LedgerLift', 'web_app', 'MVP for a small-business expense tracker. Auth, capture receipts, monthly summary, export to CSV.', '£5,000 to £20,000', '1 to 3 months', 'LinkedIn'],
  ];
  for (const [name, email, company, type, desc, budget, timeline, source] of apps) {
    await c.query(
      `insert into applications (full_name, email, company, project_type, project_description, budget_range, timeline, source)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [name, email, company, type, desc, budget, timeline, source],
    );
  }
}

export async function seed(
  databaseUrl: string | undefined = process.env.DATABASE_URL,
  opts: { silent?: boolean } = {},
): Promise<void> {
  if (!databaseUrl) throw new Error('DATABASE_URL not set');
  const log = (m: string) => {
    if (!opts.silent) console.log(m);
  };
  const c = new Client({ connectionString: databaseUrl });
  await c.connect();
  try {
    const ids: Record<string, string> = {};
    for (const u of DEMO_USERS) {
      ids[u.role] = await seedUser(c, u);
      log(`  ✓ ${u.role.padEnd(10)} ${u.email}`);
    }
    await seedPlanTemplates(c);
    log(`  ✓ ${PLAN_TEMPLATES.length} plan templates`);
    await seedProgrammes(c);
    log(`  ✓ ${PROGRAMMES.length} programmes + cohorts`);
    await seedSaasApps(c);
    await seedLogovault(c);
    await seedLeadSources(c);
    await seedLeadIcps(c);
    await seedOwnUptimeCheck(c);
    log('  ✓ saas apps, logovault brands, lead sources, ICPs, default campaign, uptime check');
    await seedDemoProject(c, ids.client, ids.developer);
    await seedDemoApplications(c);
    log('  ✓ demo project + requests + applications');
    log('\nDone. Demo credentials:');
    log('  Admin:     callum.saxon@elevatesl.co.uk / change-me-after-seeding (change it!)');
    log('  Developer: demo.developer@out-of-house.dev / demo-developer-2026');
    log('  Client:    demo.client@out-of-house.dev / demo-client-2026');
  } finally {
    await c.end();
  }
}

if (require.main === module) {
  seed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
