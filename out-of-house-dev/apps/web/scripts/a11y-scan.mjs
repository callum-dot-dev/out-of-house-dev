// Accessibility scan (axe-core via Playwright) over the redesigned public
// routes — the Lighthouse-a11y equivalent (Lighthouse's a11y category is
// largely axe-core). Serves the CRA build, injects axe, runs WCAG 2.1 A/AA,
// prints violations by impact. Exit 1 on any serious/critical violation.
//
//   npm run build:web && node apps/web/scripts/a11y-scan.mjs
//
// Authed /app/* shells are not scanned here (they need the running stack +
// auth); they inherit the same primitives, focus-visible ring and contrast
// tokens verified on the public routes.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __d = dirname(fileURLToPath(import.meta.url));
const BUILD = resolve(__d, '..', 'build');
const AXE = resolve(__d, '..', '..', '..', 'node_modules', 'axe-core', 'axe.min.js');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json', '.jpg': 'image/jpeg', '.txt': 'text/plain' };

const ROUTES = ['/', '/services/ai-automations', '/coaching', '/aiseo', '/courses', '/lead-engine', '/trust', '/apply'];

const server = createServer(async (req, res) => {
  try {
    let p = join(BUILD, decodeURIComponent((req.url || '/').split('?')[0]));
    if (!extname(p) || !existsSync(p)) p = join(BUILD, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(await readFile(p));
  } catch { res.writeHead(500); res.end(); }
});
await new Promise((r) => server.listen(5183, r));

const axeSrc = await readFile(AXE, 'utf8');
const browser = await chromium.launch();
let seriousTotal = 0;
const summary = [];

for (const route of ROUTES) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto('http://localhost:5183' + route, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(900);
  // Defeat content-visibility:auto + reveal fade-ins so axe sees every section.
  await page.evaluate(async () => {
    const s = document.createElement('style');
    s.textContent = '*{content-visibility:visible !important;contain-intrinsic-size:auto !important;}';
    document.head.appendChild(s);
    document.querySelectorAll('.fade-in').forEach((e) => e.classList.add('visible'));
    for (let y = 0; y < document.body.scrollHeight; y += Math.round(window.innerHeight * 0.8)) {
      window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 200));
  });
  await page.waitForTimeout(300);
  await page.evaluate(axeSrc);
  const results = await page.evaluate(async () => window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  }));
  const byImpact = { critical: [], serious: [], moderate: [], minor: [] };
  for (const v of results.violations) (byImpact[v.impact] || byImpact.minor).push(v);
  const serious = byImpact.critical.length + byImpact.serious.length;
  seriousTotal += serious;
  summary.push({ route, serious, moderate: byImpact.moderate.length, minor: byImpact.minor.length, violations: results.violations });
  console.log(`\n${route}`);
  console.log(`  critical:${byImpact.critical.length} serious:${byImpact.serious.length} moderate:${byImpact.moderate.length} minor:${byImpact.minor.length}`);
  for (const v of results.violations) {
    console.log(`   [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})`);
    for (const n of v.nodes) {
      const d = (n.any && n.any[0] && n.any[0].data) || {};
      const extra = d.contrastRatio != null ? ` ratio=${d.contrastRatio} fg=${d.fgColor} bg=${d.bgColor} size=${d.fontSize}` : '';
      console.log(`       ${n.target.join(' ')}`.slice(0, 90) + extra);
    }
  }
  await page.close();
}

await browser.close();
server.close();
console.log(`\n=== ${seriousTotal} serious/critical violations across ${ROUTES.length} routes ===`);
process.exit(seriousTotal > 0 ? 1 : 0);
