#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Seed script: creates demo users, demo projects/requests, and plan templates.
 *
 * Prereqs:
 *  - npm install
 *  - .env.local has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *    (service role key from Project → API → Project API keys → service_role)
 *  - You've run supabase/migrations/001_initial.sql
 *
 * Usage: npm run seed
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('SUPABASE_URL is the same as REACT_APP_SUPABASE_URL.');
  console.error('SUPABASE_SERVICE_ROLE_KEY comes from Project → API → service_role (KEEP IT SECRET).');
  process.exit(1);
}

const admin = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// --- Plan templates copied from src/data/planTemplates.js ----
// (Duplicated here so we don't need to set up TS/transpile.)
const { PLAN_TEMPLATES, CLAUDE_HANDOFFS } = require('../src/data/planTemplates');

const DEMO_USERS = [
  { email: 'callum.saxon@elevatesl.co.uk',  password: 'change-me-after-seeding', full_name: 'Callum Saxon',  role: 'admin',     company: 'out-of-house.dev' },
  { email: 'demo.developer@out-of-house.dev', password: 'demo-developer-2026',   full_name: 'Demo Developer', role: 'developer', company: 'out-of-house.dev' },
  { email: 'demo.client@out-of-house.dev',    password: 'demo-client-2026',      full_name: 'Demo Client',    role: 'client',    company: 'Acme Coffee Roasters' },
];

async function upsertUser(u) {
  // Find existing
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find(x => x.email === u.email);
  let id;
  if (existing) {
    id = existing.id;
    await admin.auth.admin.updateUserById(id, {
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });
    if (error) throw error;
    id = data.user.id;
  }
  // Ensure profile row matches
  await admin.from('profiles').upsert({
    id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    company: u.company,
  });
  return id;
}

async function seedPlanTemplates() {
  for (const t of PLAN_TEMPLATES) {
    const { error } = await admin.from('plan_templates').upsert(
      {
        type: t.type,
        name: t.name,
        summary: t.summary,
        phases: t.phases,
        claude_code_handoff: CLAUDE_HANDOFFS[t.type] || '',
      },
      { onConflict: 'type,name' },
    );
    if (error) console.warn('template', t.name, error.message);
  }
  console.log(`  ✓ ${PLAN_TEMPLATES.length} plan templates seeded`);
}

async function seedDemoProject(clientId, developerId) {
  // Skip if a demo project already exists for this client
  const { data: existingProjects } = await admin.from('projects').select('id').eq('client_id', clientId);
  if (existingProjects?.length) {
    console.log('  · demo project already exists for client, skipping');
    return existingProjects[0].id;
  }

  const { data: project, error: pErr } = await admin.from('projects').insert([{
    client_id: clientId,
    name: 'Acme Coffee Roasters: Website refresh',
    project_type: 'website',
    description: 'Modern marketing site for Acme Coffee Roasters. Hero, story, product grid, wholesale enquiry form. Same-day delivery target.',
    status: 'building',
  }]).select('*').single();
  if (pErr) throw pErr;

  const requests = [
    { title: 'Hero copy + image direction',  description: 'Lock the hero headline, sub, and pick a hero treatment (lifestyle vs product macro).', priority: 'high',   status: 'shipped', claimed_by: developerId },
    { title: 'Product grid with filters',    description: 'Filterable product grid (origin, roast, bag size). Link each to the product page.',     priority: 'high',   status: 'building', claimed_by: developerId },
    { title: 'Wholesale enquiry form',       description: 'Form that captures company name, expected volume, email. Routes to founder inbox.',     priority: 'medium', status: 'scoped',   claimed_by: null },
    { title: 'Newsletter signup',            description: 'Footer signup, posts to Mailchimp. Double opt-in.',                                       priority: 'low',    status: 'submitted', claimed_by: null },
    { title: 'Instagram feed embed',         description: 'Latest 6 posts in a strip on the home page.',                                             priority: 'low',    status: 'submitted', claimed_by: null },
  ];

  for (const r of requests) {
    await admin.from('feature_requests').insert([{ ...r, project_id: project.id, created_by: clientId }]);
  }
  console.log(`  ✓ demo project + ${requests.length} requests`);

  // Attach a plan
  const { data: template } = await admin.from('plan_templates').select('*').eq('type', 'website').limit(1).single();
  if (template) {
    await admin.from('project_plans').insert([{
      project_id: project.id,
      template_id: template.id,
      phases: template.phases,
      current_phase_index: 2, // mid-build
      current_step_index: 1,
    }]);
    console.log('  ✓ plan attached to demo project');
  }

  return project.id;
}

async function seedDemoApplications() {
  const { count } = await admin.from('applications').select('*', { count: 'exact', head: true });
  if (count && count > 0) {
    console.log('  · applications already exist, skipping');
    return;
  }
  const apps = [
    { full_name: 'Sara Lim',     email: 'sara@northlight.studio',  company: 'Northlight Studio',  phone: '',           project_type: 'website',         project_description: 'New marketing site for our photography studio. 5 pages, portfolio grid, contact form.', budget_range: '£1,000 to £5,000', timeline: 'ASAP',           source: 'Referral',  status: 'pending' },
    { full_name: 'Marcus Webb',  email: 'marcus@routerly.io',      company: 'Routerly',           phone: '+44 7700 1234', project_type: 'automation',     project_description: 'Need an automation that processes inbound sales emails: classify, draft reply, push to HubSpot.', budget_range: '£5,000 to £20,000', timeline: 'Within a month', source: 'Search',    status: 'pending' },
    { full_name: 'Priya Shah',   email: 'priya@ledgerlift.co',     company: 'LedgerLift',         phone: '',           project_type: 'web_app',         project_description: 'MVP for a small-business expense tracker. Auth, capture receipts, monthly summary, export to CSV.', budget_range: '£5,000 to £20,000', timeline: '1 to 3 months',     source: 'LinkedIn',  status: 'pending' },
  ];
  await admin.from('applications').insert(apps);
  console.log(`  ✓ ${apps.length} demo applications`);
}

async function main() {
  console.log('Seeding Supabase…');

  console.log('• Users');
  for (const u of DEMO_USERS) {
    const id = await upsertUser(u);
    u.id = id;
    console.log(`  ✓ ${u.role.padEnd(10)} ${u.email}`);
  }
  const client = DEMO_USERS.find(u => u.role === 'client');
  const dev    = DEMO_USERS.find(u => u.role === 'developer');

  console.log('• Plan templates');
  await seedPlanTemplates();

  console.log('• Demo project + requests');
  await seedDemoProject(client.id, dev.id);

  console.log('• Demo applications');
  await seedDemoApplications();

  console.log('\nDone. Demo credentials:');
  console.log('  Admin:     callum.saxon@elevatesl.co.uk / change-me-after-seeding');
  console.log('  Developer: demo.developer@out-of-house.dev / demo-developer-2026');
  console.log('  Client:    demo.client@out-of-house.dev / demo-client-2026');
}

main().catch(err => { console.error(err); process.exit(1); });
