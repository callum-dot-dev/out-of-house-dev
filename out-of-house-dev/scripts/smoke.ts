// Smoke test against any base URL. Exits non-zero on any failure.
//   tsx scripts/smoke.ts [https://api.out-of-house.dev]
const BASE = (process.argv[2] || process.env.SMOKE_BASE || 'http://localhost:4000').replace(/\/$/, '');

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];

async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, detail: e instanceof Error ? e.message : String(e) });
  }
}

async function getJson(path: string): Promise<unknown> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}

async function main(): Promise<void> {
  await check('GET /api/v1/health', async () => {
    const j = (await getJson('/api/v1/health')) as { ok?: boolean };
    if (!j.ok) throw new Error('health not ok');
  });
  await check('GET /api/v1/status', async () => {
    await getJson('/api/v1/status');
  });
  await check('GET /api/v1/live', async () => {
    await getJson('/api/v1/live');
  });
  await check('GET /api/v1/programmes', async () => {
    const j = (await getJson('/api/v1/programmes')) as { programmes?: unknown[] };
    if (!Array.isArray(j.programmes)) throw new Error('no programmes');
  });
  await check('GET /api/v1/changelog', async () => {
    await getJson('/api/v1/changelog');
  });
  await check('GET /api/v1/logovault/search?q=stripe', async () => {
    const j = (await getJson('/api/v1/logovault/search?q=stripe')) as { results?: unknown[] };
    if (!Array.isArray(j.results)) throw new Error('no results array');
  });
  await check('POST /api/v1/aiseo/audit (example.com)', async () => {
    const r = await fetch(`${BASE}/api/v1/aiseo/audit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ domain: 'example.com' }) });
    if (!r.ok) throw new Error(`audit -> ${r.status}`);
    const j = (await r.json()) as { checks?: unknown[] };
    if (!Array.isArray(j.checks) || j.checks.length !== 14) throw new Error('expected 14 checks');
  });

  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
  console.log(`\nsmoke: ${results.length - failed.length}/${results.length} passed (base ${BASE})`);
  if (failed.length) process.exit(1);
}

void main();
