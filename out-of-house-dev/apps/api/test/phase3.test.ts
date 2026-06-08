import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { FastifyInstance } from 'fastify';
import { startTestPg, type TestPg } from '../../../db/testing/pg';
import { migrate } from '../../../db/migrate';
import { seed } from '../../../db/seeds/seed';
import { buildApp } from '../src/app';
import { query } from '../src/lib/db';
import { getSentEmails, clearSentEmails } from '../src/services/email';
import { signWebhook } from '../src/lib/stripe';

let pg: TestPg;
let app: FastifyInstance;
let fileRoot: string;
let richServer: Server;
let bareServer: Server;
let richUrl: string;
let bareUrl: string;

type Jar = Record<string, string>;
const absorb = (jar: Jar, res: { cookies?: Array<{ name: string; value: string }> }): Jar => {
  for (const c of res.cookies ?? []) jar[c.name] = c.value;
  return jar;
};
const cookieHeader = (jar: Jar): string => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
async function postJson(url: string, body: unknown, jar: Jar, raw?: string, extraHeaders?: Record<string, string>) {
  const headers: Record<string, string> = { cookie: cookieHeader(jar), 'content-type': 'application/json', ...extraHeaders };
  if (jar['XSRF-TOKEN']) headers['x-csrf-token'] = jar['XSRF-TOKEN'];
  const res = await app.inject({ method: 'POST', url, headers, payload: raw ?? JSON.stringify(body) });
  absorb(jar, res);
  return res;
}
const ADMIN = { email: 'callum.saxon@elevatesl.co.uk', password: 'change-me-after-seeding' };
const CLIENT = { email: 'demo.client@out-of-house.dev', password: 'demo-client-2026' };

const RICH_HTML = `<!doctype html><html><head>
<title>Acme AI Automation — UK B2B</title>
<meta name="description" content="Acme builds AI automations for UK SMBs.">
<link rel="canonical" href="http://example.test/">
<meta property="og:title" content="Acme AI">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@type":"Organization","logo":"/l.png","sameAs":["https://x.com/acme"]}</script>
<script type="application/ld+json">{"@type":"FAQPage","mainEntity":[]}</script>
<script type="application/ld+json">{"@type":"Person","name":"Jane"}</script>
<script type="application/ld+json">{"@type":"Service","name":"Automation"}</script>
</head><body>
<h1>AI automation for UK businesses</h1>
<h2>What we do</h2><h2>How it works</h2><h3>Step one</h3>
<p>${'automation workflow value '.repeat(400)}</p>
</body></html>`;

beforeAll(async () => {
  pg = await startTestPg();
  process.env.DATABASE_URL = pg.url;
  process.env.NODE_ENV = 'test';
  process.env.PUBLIC_SITE_URL = 'http://localhost:3000';
  process.env.ALLOW_PRIVATE_FETCH = 'true';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
  fileRoot = mkdtempSync(join(tmpdir(), 'oohp3-'));
  process.env.FILE_STORE_ROOT = fileRoot;
  await migrate(pg.url, { silent: true });
  await seed(pg.url, { silent: true });
  app = await buildApp();
  await app.ready();

  richServer = createServer((req, res) => {
    if (req.url === '/llms.txt') return void res.end('# Acme\nWe build AI automations for UK SMBs. '.repeat(3));
    if (req.url === '/robots.txt') return void res.end('User-agent: GPTBot\nAllow: /\nUser-agent: *\nAllow: /');
    if (req.url === '/sitemap.xml') return void res.end('<?xml version="1.0"?><urlset></urlset>');
    res.setHeader('content-type', 'text/html');
    res.end(RICH_HTML);
  });
  bareServer = createServer((req, res) => {
    if (req.url === '/') {
      res.setHeader('content-type', 'text/html');
      return void res.end('<html><body><h1>Hi</h1></body></html>');
    }
    res.statusCode = 404;
    res.end('not found');
  });
  await new Promise<void>((r) => richServer.listen(0, '127.0.0.1', r));
  await new Promise<void>((r) => bareServer.listen(0, '127.0.0.1', r));
  richUrl = `http://127.0.0.1:${(richServer.address() as AddressInfo).port}`;
  bareUrl = `http://127.0.0.1:${(bareServer.address() as AddressInfo).port}`;
}, 180_000);

afterAll(async () => {
  await app?.close();
  await new Promise<void>((r) => richServer?.close(() => r()));
  await new Promise<void>((r) => bareServer?.close(() => r()));
  await pg?.stop();
  if (fileRoot) try { rmSync(fileRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe('funnel entry: apply -> approve -> invite + project -> claim', () => {
  it('runs the full flow', async () => {
    const apply = await postJson('/api/v1/apply', {
      full_name: 'Test Founder',
      email: 'founder@newco.test',
      company: 'NewCo',
      project_type: 'website',
      project_description: 'We need a same-day marketing site for our coffee roastery.',
    }, {});
    expect(apply.statusCode).toBe(201);
    const appId = JSON.parse(apply.body).application_id;

    const adminJar: Jar = {};
    await postJson('/api/v1/auth/login', ADMIN, adminJar);
    clearSentEmails();
    const approve = await postJson(`/api/v1/admin/applications/${appId}/approve`, {}, adminJar);
    expect(approve.statusCode).toBe(200);
    const { user_id, project_id } = JSON.parse(approve.body);
    expect(user_id).toBeTruthy();
    expect(project_id).toBeTruthy();

    // user created (no password), project created, invite emailed
    const user = (await query<{ password_hash: string | null }>('select password_hash from users where id=$1', [user_id])).rows[0];
    expect(user.password_hash).toBeNull();
    const proj = (await query('select id from projects where id=$1 and created_from_application_id=$2', [project_id, appId])).rows;
    expect(proj).toHaveLength(1);
    const invite = getSentEmails().find((e) => e.template === 'application-approved');
    const token = (invite?.meta as { token?: string } | undefined)?.token;
    expect(token).toBeTruthy();

    // claim the account
    const claimJar: Jar = {};
    const claim = await postJson('/api/v1/auth/register', { email: 'founder@newco.test', password: 'claimedpw1', inviteToken: token }, claimJar);
    expect(claim.statusCode).toBe(200);
    // now they can read their project
    const me = await app.inject({ method: 'GET', url: `/api/v1/projects/${project_id}`, headers: { cookie: cookieHeader(claimJar) } });
    expect(me.statusCode).toBe(200);
  });
});

describe('checkout (server-side price book) + stripe webhook idempotency', () => {
  it('creates a pending payment at the catalogue price and completes it once', async () => {
    const jar: Jar = {};
    await postJson('/api/v1/auth/login', CLIENT, jar);

    const checkout = await postJson('/api/v1/checkout', { product_ref: 'course:ai-builder-6w' }, jar);
    expect(checkout.statusCode).toBe(200);
    const { payment_id, configured } = JSON.parse(checkout.body);
    expect(configured).toBe(false); // no STRIPE_SECRET_KEY -> stub
    const pay = (await query<{ amount_gbp: string; product_type: string; status: string }>('select amount_gbp, product_type, status from payments where id=$1', [payment_id])).rows[0];
    expect(Number(pay.amount_gbp)).toBe(795); // from the server-side catalogue, not the client
    expect(pay.product_type).toBe('course');
    expect(pay.status).toBe('pending');

    // craft + sign a checkout.session.completed event for this payment
    const event = JSON.stringify({
      id: 'evt_test_idemp_1',
      type: 'checkout.session.completed',
      data: { object: { metadata: { payment_id }, payment_intent: 'pi_test_1', subscription: null } },
    });
    const sig = signWebhook(event, 'whsec_test_secret', 1_700_000_000);

    const first = await app.inject({ method: 'POST', url: '/api/v1/webhooks/stripe', headers: { 'content-type': 'application/json', 'stripe-signature': sig }, payload: event });
    expect(first.statusCode).toBe(200);
    expect(JSON.parse(first.body).received).toBe(true);

    const second = await app.inject({ method: 'POST', url: '/api/v1/webhooks/stripe', headers: { 'content-type': 'application/json', 'stripe-signature': sig }, payload: event });
    expect(JSON.parse(second.body).duplicate).toBe(true);

    // payment succeeded exactly once; one stripe_events row; one enrollment
    const after = (await query<{ status: string }>('select status from payments where id=$1', [payment_id])).rows[0];
    expect(after.status).toBe('succeeded');
    const evCount = (await query<{ n: number }>("select count(*)::int as n from stripe_events where id='evt_test_idemp_1'")).rows[0].n;
    expect(evCount).toBe(1);
    const enrol = (await query<{ n: number }>(
      "select count(*)::int as n from enrollments e join programmes p on p.id=e.programme_id where p.slug='ai-builder-6w' and e.status='paid'",
    )).rows[0].n;
    expect(enrol).toBe(1);
  });

  it('rejects a webhook with a bad signature', async () => {
    const event = JSON.stringify({ id: 'evt_bad', type: 'checkout.session.completed', data: { object: {} } });
    const res = await app.inject({ method: 'POST', url: '/api/v1/webhooks/stripe', headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=deadbeef' }, payload: event });
    expect(res.statusCode).toBe(400);
  });
});

describe('logovault search + metering', () => {
  it('returns seeded brands and records api_usage', async () => {
    const before = (await query<{ n: number }>("select count(*)::int as n from api_usage where saas_app_slug='logovault'")).rows[0].n;
    const res = await app.inject({ method: 'GET', url: '/api/v1/logovault/search?q=stripe' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.results.some((r: { slug: string }) => r.slug === 'stripe')).toBe(true);
    const after = (await query<{ n: number }>("select count(*)::int as n from api_usage where saas_app_slug='logovault'")).rows[0].n;
    expect(after).toBe(before + 1);
  });
});

describe('aiseo audit (14 checks, pass + fail paths)', () => {
  it('grades a rich site high and a bare site low', async () => {
    const rich = JSON.parse((await app.inject({ method: 'POST', url: '/api/v1/aiseo/audit', headers: { 'content-type': 'application/json' }, payload: JSON.stringify({ domain: richUrl }) })).body);
    const bare = JSON.parse((await app.inject({ method: 'POST', url: '/api/v1/aiseo/audit', headers: { 'content-type': 'application/json' }, payload: JSON.stringify({ domain: bareUrl }) })).body);

    expect(rich.checks).toHaveLength(14);
    expect(bare.checks).toHaveLength(14);
    expect(rich.score).toBeGreaterThan(bare.score);
    expect(['A', 'B']).toContain(rich.grade);
    expect(['D', 'F']).toContain(bare.grade);

    const check = (r: { checks: Array<{ id: string; status: string }> }, id: string) => r.checks.find((c) => c.id === id)?.status;
    expect(check(rich, 'org_schema')).toBe('pass');
    expect(check(bare, 'org_schema')).toBe('fail');
    expect(check(rich, 'llms_txt')).toBe('pass');
    expect(check(bare, 'llms_txt')).toBe('fail');

    // persisted
    const audits = (await query<{ n: number }>('select count(*)::int as n from aiseo_audits')).rows[0].n;
    expect(audits).toBeGreaterThanOrEqual(2);
  });
});
