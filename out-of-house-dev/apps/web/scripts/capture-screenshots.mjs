// Screenshot capture for redesign before/after comparison.
//
// Serves the CRA production build (apps/web/build) with SPA fallback, then
// drives the installed Playwright Chromium over every public marketing route
// and writes a full-page desktop PNG per route (plus a mobile homepage shot).
//
// Usage (from repo root or apps/web):
//   npm run build:web            # produce apps/web/build first
//   node apps/web/scripts/capture-screenshots.mjs
//
// Env:
//   OUT_DIR   output directory (default docs/audit/screenshots/2026-07-live)
//   PORT      static server port (default 5177)
//
// Authed /app/* shells are intentionally NOT captured here: they require the
// full api+jobs+Postgres stack and seeded auth, which is out of scope for a
// static "before" baseline. See docs/prompts/BLOCKERS.md.

import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, extname } from 'node:path';
import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, '..');            // apps/web
const REPO_ROOT = resolve(WEB_ROOT, '..', '..');      // workspace root
const BUILD_DIR = join(WEB_ROOT, 'build');
const OUT_DIR = process.env.OUT_DIR
  ? resolve(REPO_ROOT, process.env.OUT_DIR)
  : join(REPO_ROOT, 'docs', 'audit', 'screenshots', '2026-07-live');
const PORT = Number(process.env.PORT || 5177);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.map': 'application/json',
  '.txt': 'text/plain', '.webp': 'image/webp',
};

// name -> route. Public marketing + auth-microcopy routes from audit §3.
const ROUTES = [
  ['home', '/'],
  ['services-ai-automations', '/services/ai-automations'],
  ['services-ai-growth', '/services/ai-growth'],
  ['services-websites', '/services/websites'],
  ['services-web-apps', '/services/web-apps'],
  ['services-internal-tools', '/services/internal-tools'],
  ['services-maintenance', '/services/maintenance'],
  ['coaching', '/coaching'],
  ['coaching-business', '/coaching/business'],
  ['coaching-developers', '/coaching/developers'],
  ['courses', '/courses'],
  ['course-ai-fast-start-3w', '/courses/ai-fast-start-3w'],
  ['course-ai-engineer-12w', '/courses/ai-engineer-12w'],
  ['saas', '/saas'],
  ['saas-logovault', '/saas/logovault'],
  ['lead-engine', '/lead-engine'],
  ['aiseo', '/aiseo'],
  ['showcase', '/showcase'],
  ['changelog', '/changelog'],
  ['developers', '/developers'],
  ['trust', '/trust'],
  ['subprocessors', '/subprocessors'],
  ['terms-and-conditions', '/terms-and-conditions'],
  ['privacy-policy', '/privacy-policy'],
  ['apply', '/apply'],
  ['login', '/login'],
  ['password-reset', '/password-reset'],
];

// Scroll the whole page in steps so IntersectionObserver reveal-on-scroll
// sections fire, then return to top — otherwise a fullPage shot leaves every
// below-the-fold section at opacity:0.
async function revealAll(page) {
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const step = Math.round(window.innerHeight * 0.8);
    let y = 0;
    const max = () => document.body.scrollHeight;
    while (y < max()) {
      window.scrollTo(0, y);
      await sleep(120);
      y += step;
    }
    window.scrollTo(0, max());
    await sleep(200);
    // Belt-and-braces: force every reveal-on-scroll element visible so a
    // headless fullPage shot never leaves a below-the-fold section at opacity:0.
    document.querySelectorAll('.fade-in, .reveal, [data-reveal]').forEach((el) => {
      el.classList.add('visible', 'is-visible');
    });
    window.scrollTo(0, 0);
    await sleep(250);
  });
  await page.waitForTimeout(300);
}

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = join(BUILD_DIR, urlPath);
      const ext = extname(filePath);
      if (!ext) filePath = join(BUILD_DIR, 'index.html'); // SPA fallback
      if (!existsSync(filePath)) filePath = join(BUILD_DIR, 'index.html');
      const body = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(500);
      res.end('err');
    }
  });
  return new Promise((res) => server.listen(PORT, () => res(server)));
}

async function main() {
  if (!existsSync(join(BUILD_DIR, 'index.html'))) {
    console.error(`No build at ${BUILD_DIR}. Run "npm run build:web" first.`);
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });
  const server = await startServer();
  const base = `http://localhost:${PORT}`;
  const browser = await chromium.launch();
  const captured = [];
  const failed = [];

  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') { /* noted per-route below */ } });

  for (const [name, route] of ROUTES) {
    const errors = [];
    const onErr = (m) => { if (m.type() === 'error') errors.push(m.text()); };
    page.on('console', onErr);
    try {
      await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(800); // settle client render
      await revealAll(page);          // trigger IntersectionObserver fade-ups full-height
      const file = join(OUT_DIR, `${name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      captured.push({ name, route, errors: errors.length });
      console.log(`  ✓ ${name}  (${route})${errors.length ? `  [${errors.length} console errors]` : ''}`);
    } catch (e) {
      failed.push({ name, route, error: String(e).split('\n')[0] });
      console.log(`  ✗ ${name}  (${route})  ${String(e).split('\n')[0]}`);
    }
    page.off('console', onErr);
  }

  // Mobile homepage
  try {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const mp = await m.newPage();
    await mp.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await mp.waitForTimeout(800);
    await revealAll(mp);
    await mp.screenshot({ path: join(OUT_DIR, 'home-mobile.png'), fullPage: true });
    captured.push({ name: 'home-mobile', route: '/ (390px)', errors: 0 });
    console.log('  ✓ home-mobile  (/ @390px)');
    await m.close();
  } catch (e) {
    console.log(`  ✗ home-mobile  ${String(e).split('\n')[0]}`);
  }

  await browser.close();
  server.close();

  await writeFile(
    join(OUT_DIR, 'manifest.json'),
    JSON.stringify({ capturedAt: process.env.CAPTURE_LABEL || 'unlabelled', base, captured, failed }, null, 2),
  );
  console.log(`\nCaptured ${captured.length} routes → ${OUT_DIR}${failed.length ? `  (${failed.length} failed)` : ''}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
