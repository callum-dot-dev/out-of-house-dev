import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { startTestPg, type TestPg } from '../../../db/testing/pg';
import { migrate } from '../../../db/migrate';
import { seed } from '../../../db/seeds/seed';
import { buildApp } from '../src/app';
import { startRealtimeBridge } from '../src/lib/realtime';
import { notify } from '../src/services/notifications';
import { clearSentEmails, getSentEmails } from '../src/services/email';
import { query } from '../src/lib/db';
import { sha256 } from '../src/lib/crypto';

let pg: TestPg;
let app: FastifyInstance;
let baseUrl: string;
let fileRoot: string;

type Jar = Record<string, string>;
const absorb = (jar: Jar, res: { cookies?: Array<{ name: string; value: string }> }): Jar => {
  for (const c of res.cookies ?? []) jar[c.name] = c.value;
  return jar;
};
const cookieHeader = (jar: Jar): string =>
  Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

async function postJson(url: string, body: unknown, jar: Jar) {
  const headers: Record<string, string> = { cookie: cookieHeader(jar), 'content-type': 'application/json' };
  if (jar['XSRF-TOKEN']) headers['x-csrf-token'] = jar['XSRF-TOKEN'];
  const res = await app.inject({ method: 'POST', url, headers, payload: JSON.stringify(body) });
  absorb(jar, res);
  return res;
}
async function getJson(url: string, jar: Jar) {
  const res = await app.inject({ method: 'GET', url, headers: { cookie: cookieHeader(jar) } });
  absorb(jar, res);
  return res;
}

async function createInvite(email: string, role = 'client'): Promise<string> {
  const token = `invite-${randomUUID()}`;
  await query(
    "insert into auth_tokens(purpose, token_hash, email, role, expires_at) values ('invite',$1,$2,$3, now() + interval '1 day')",
    [sha256(token), email, role],
  );
  return token;
}

const ADMIN = { email: 'callum.saxon@elevatesl.co.uk', password: 'change-me-after-seeding' };
const CLIENT = { email: 'demo.client@out-of-house.dev', password: 'demo-client-2026' };
const DEV = { email: 'demo.developer@out-of-house.dev', password: 'demo-developer-2026' };

beforeAll(async () => {
  pg = await startTestPg();
  process.env.DATABASE_URL = pg.url;
  process.env.NODE_ENV = 'test';
  process.env.PUBLIC_SITE_URL = 'http://localhost:3000';
  fileRoot = mkdtempSync(join(tmpdir(), 'oohfiles-'));
  process.env.FILE_STORE_ROOT = fileRoot;
  await migrate(pg.url, { silent: true });
  await seed(pg.url, { silent: true });
  app = await buildApp();
  await startRealtimeBridge();
  await app.listen({ port: 0, host: '127.0.0.1' });
  const addr = app.server.address();
  baseUrl = typeof addr === 'object' && addr ? `http://127.0.0.1:${addr.port}` : 'http://127.0.0.1:0';
}, 180_000);

afterAll(async () => {
  await app?.close();
  await pg?.stop();
  if (fileRoot) {
    try {
      rmSync(fileRoot, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

describe('auth lifecycle (register via invite -> me -> refresh -> logout)', () => {
  const jar: Jar = {};
  it('registers an invited client and runs the session lifecycle', async () => {
    const invite = await createInvite('lifecycle@test.dev', 'client');
    const reg = await postJson('/api/v1/auth/register', { email: 'lifecycle@test.dev', password: 'password123', inviteToken: invite }, jar);
    expect(reg.statusCode).toBe(201);
    expect(JSON.parse(reg.body).user.role).toBe('client');

    expect((await getJson('/api/v1/me', jar)).statusCode).toBe(200);

    const refreshed = await postJson('/api/v1/auth/refresh', {}, jar);
    expect(refreshed.statusCode).toBe(200);

    expect((await postJson('/api/v1/auth/logout', {}, jar)).statusCode).toBe(200);

    // refresh after logout fails (session revoked / cookie cleared)
    const afterLogout = await postJson('/api/v1/auth/refresh', {}, jar);
    expect(afterLogout.statusCode).toBe(401);
  });

  it('rejects registration without an invite (invite-only)', async () => {
    const jar2: Jar = {};
    const reg = await postJson('/api/v1/auth/register', { email: 'noinvite@test.dev', password: 'password123' }, jar2);
    expect(reg.statusCode).toBe(403);
  });
});

describe('login + magic link', () => {
  it('logs in with a password', async () => {
    const jar: Jar = {};
    const res = await postJson('/api/v1/auth/login', CLIENT, jar);
    expect(res.statusCode).toBe(200);
    expect(jar['ooh_at']).toBeTruthy();
  });

  it('completes a magic-link round trip (dry-run email captured)', async () => {
    clearSentEmails();
    await postJson('/api/v1/auth/magic/request', { email: CLIENT.email }, {});
    const emails = getSentEmails();
    const last = emails[emails.length - 1];
    expect(last?.template).toBe('magic-link');
    const token = (last?.meta as { token?: string } | undefined)?.token;
    expect(token).toBeTruthy();

    const jar: Jar = {};
    const consume = await postJson('/api/v1/auth/magic/consume', { token }, jar);
    expect(consume.statusCode).toBe(200);
    expect(jar['ooh_at']).toBeTruthy();
  });
});

describe('cross-account isolation (red-team v1)', () => {
  const jarA: Jar = {};
  const jarB: Jar = {};
  const jarDev: Jar = {};
  let projectId: string;
  let requestId: string;
  let visibleDocId: string;
  let internalDocId: string;

  beforeAll(async () => {
    await postJson('/api/v1/auth/login', CLIENT, jarA);
    await postJson('/api/v1/auth/login', DEV, jarDev);
    const inviteB = await createInvite('clientb@test.dev', 'client');
    await postJson('/api/v1/auth/register', { email: 'clientb@test.dev', password: 'password123', inviteToken: inviteB }, jarB);

    projectId = (await query<{ id: string }>('select id from projects limit 1')).rows[0].id;
    requestId = (await query<{ id: string }>('select id from feature_requests limit 1')).rows[0].id;
    visibleDocId = (
      await query<{ id: string }>(
        "insert into project_documents(project_id, title, visible_to_client) values ($1,'Visible',true) returning id",
        [projectId],
      )
    ).rows[0].id;
    internalDocId = (
      await query<{ id: string }>(
        "insert into project_documents(project_id, title, visible_to_client) values ($1,'Internal',false) returning id",
        [projectId],
      )
    ).rows[0].id;
  });

  it('owner (client A) can read their own project + request', async () => {
    expect((await getJson(`/api/v1/projects/${projectId}`, jarA)).statusCode).toBe(200);
    expect((await getJson(`/api/v1/requests/${requestId}`, jarA)).statusCode).toBe(200);
  });

  it('client B cannot read or list client A resources', async () => {
    expect((await getJson(`/api/v1/projects/${projectId}`, jarB)).statusCode).toBe(404);
    expect((await getJson(`/api/v1/projects/${projectId}/requests`, jarB)).statusCode).toBe(404);
    expect((await getJson(`/api/v1/requests/${requestId}`, jarB)).statusCode).toBe(404);
    const list = await getJson('/api/v1/projects', jarB);
    expect(JSON.parse(list.body).projects).toHaveLength(0);
  });

  it('document visibility: client sees visible-only, staff sees internal', async () => {
    expect((await getJson(`/api/v1/documents/${visibleDocId}`, jarA)).statusCode).toBe(200);
    expect((await getJson(`/api/v1/documents/${internalDocId}`, jarA)).statusCode).toBe(404); // internal hidden from client
    expect((await getJson(`/api/v1/documents/${visibleDocId}`, jarB)).statusCode).toBe(404); // not their project
    expect((await getJson(`/api/v1/documents/${internalDocId}`, jarDev)).statusCode).toBe(200); // staff
  });

  it('developer (staff) can read any project', async () => {
    expect((await getJson(`/api/v1/projects/${projectId}`, jarDev)).statusCode).toBe(200);
  });
});

describe('CSRF double-submit', () => {
  it('rejects an authenticated mutation without the CSRF header, accepts with it', async () => {
    const jar: Jar = {};
    await postJson('/api/v1/auth/login', CLIENT, jar);

    const without = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me',
      headers: { cookie: cookieHeader(jar), 'content-type': 'application/json' },
      payload: '{}',
    });
    expect(without.statusCode).toBe(403);

    const withCsrf = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me',
      headers: { cookie: cookieHeader(jar), 'x-csrf-token': jar['XSRF-TOKEN'], 'content-type': 'application/json' },
      payload: '{}',
    });
    expect(withCsrf.statusCode).toBe(200);
  });
});

describe('files: upload + scope-enforced download', () => {
  it('owner downloads, a different client is forbidden', async () => {
    const jarUp: Jar = {};
    await postJson('/api/v1/auth/login', CLIENT, jarUp);

    const fd = new FormData();
    fd.append('file', new Blob([Buffer.from('hello world')], { type: 'text/plain' }), 'hello.txt');
    const up = await fetch(`${baseUrl}/api/v1/files?scope=attachments`, {
      method: 'POST',
      headers: { cookie: cookieHeader(jarUp), 'x-csrf-token': jarUp['XSRF-TOKEN'] },
      body: fd,
    });
    expect(up.status).toBe(201);
    const { file } = (await up.json()) as { file: { path: string } };

    const dl = await fetch(`${baseUrl}/api/v1/files/${file.path}`, { headers: { cookie: cookieHeader(jarUp) } });
    expect(dl.status).toBe(200);
    expect(await dl.text()).toBe('hello world');

    const jarOther: Jar = {};
    await postJson('/api/v1/auth/login', { email: 'clientb@test.dev', password: 'password123' }, jarOther);
    const dlOther = await fetch(`${baseUrl}/api/v1/files/${file.path}`, { headers: { cookie: cookieHeader(jarOther) } });
    expect(dlOther.status).toBe(403);
  }, 15_000);
});

describe('SSE realtime', () => {
  it('delivers a notify() event to a connected user', async () => {
    const jar: Jar = {};
    await postJson('/api/v1/auth/login', CLIENT, jar);
    const userId = (await query<{ id: string }>('select id from users where email=$1', [CLIENT.email])).rows[0].id;

    const controller = new AbortController();
    const res = await fetch(`${baseUrl}/api/v1/realtime`, {
      headers: { cookie: cookieHeader(jar) },
      signal: controller.signal,
    });
    expect(res.status).toBe(200);
    const reader = res.body!.getReader();

    await new Promise((r) => setTimeout(r, 200)); // let the subscription register
    await notify(userId, { kind: 'test', title: 'Hi there' });

    const dec = new TextDecoder();
    let buf = '';
    let got = false;
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const next = (await Promise.race([
        reader.read(),
        new Promise((r) => setTimeout(() => r({ done: false, value: undefined, timeout: true }), Math.max(1, deadline - Date.now()))),
      ])) as { done: boolean; value?: Uint8Array; timeout?: boolean };
      if (next.timeout || next.done) break;
      if (next.value) buf += dec.decode(next.value, { stream: true });
      if (buf.includes('Hi there')) {
        got = true;
        break;
      }
    }
    controller.abort();
    expect(got).toBe(true);
  }, 15_000);
});

describe('admin health', () => {
  it('reports db ok + integrations missing, and is admin-only', async () => {
    const adminJar: Jar = {};
    await postJson('/api/v1/auth/login', ADMIN, adminJar);
    const health = await getJson('/api/v1/admin/health', adminJar);
    expect(health.statusCode).toBe(200);
    const body = JSON.parse(health.body);
    expect(body.db).toBe('ok');
    expect(body.integrations.stripe).toBe('missing');
    expect(body.integrations.anthropic).toBe('missing');
    expect(body.email_dry_run).toBe(true);

    const clientJar: Jar = {};
    await postJson('/api/v1/auth/login', CLIENT, clientJar);
    expect((await getJson('/api/v1/admin/health', clientJar)).statusCode).toBe(403);
  });
});

describe('guest token (read-only consume)', () => {
  it('consumes a valid guest token and rejects an invalid one', async () => {
    const projectId = (await query<{ id: string }>('select id from projects limit 1')).rows[0].id;
    const token = `guest-${randomUUID()}`;
    await query(
      "insert into guest_tokens(token, project_id, scope_kind, expires_at) values ($1,$2,'project', now() + interval '1 day')",
      [token, projectId],
    );
    const ok = await postJson('/api/v1/guest/consume', { token }, {});
    expect(ok.statusCode).toBe(200);
    expect(JSON.parse(ok.body).scope.project_id).toBe(projectId);

    const bad = await postJson('/api/v1/guest/consume', { token: 'does-not-exist' }, {});
    expect(bad.statusCode).toBe(400);
  });
});

describe('login lockout', () => {
  it('locks out after 10 failed attempts', async () => {
    const email = 'lockme@test.dev';
    for (let i = 0; i < 10; i++) {
      const r = await postJson('/api/v1/auth/login', { email, password: 'wrong' }, {});
      expect(r.statusCode).toBe(401);
    }
    const locked = await postJson('/api/v1/auth/login', { email, password: 'wrong' }, {});
    expect(locked.statusCode).toBe(429);
  });
});
