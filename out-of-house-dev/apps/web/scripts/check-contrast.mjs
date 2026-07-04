// Automated WCAG contrast gate over the design tokens (design_tokens.md §7).
//
// Parses src/styles/tokens.css for solid colour tokens, then verifies every
// critical text/UI pair meets its required ratio. Fails (exit 1) on any
// regression so a token edit can't silently break AA contrast.
//
//   node apps/web/scripts/check-contrast.mjs
//
// Wired into `npm run lint` and CI.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS = join(__dirname, '..', 'src', 'styles', 'tokens.css');

// --- WCAG relative luminance + contrast ---------------------------------
function srgbToLin(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function luminance({ r, g, b }) {
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}
function contrast(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
function hexToRgb(hex) {
  const h = hex.replace('#', '').trim();
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16) };
}

// --- Parse tokens.css: name -> #hex (resolving one level of var() alias) --
function parseTokens(css) {
  const raw = {};
  const re = /(--[\w-]+):\s*([^;]+);/g;
  let m;
  while ((m = re.exec(css))) raw[m[1]] = m[2].trim();
  const resolved = {};
  for (const [name, val] of Object.entries(raw)) {
    let v = val;
    const varMatch = v.match(/^var\((--[\w-]+)\)$/);
    if (varMatch && raw[varMatch[1]]) v = raw[varMatch[1]].trim();
    if (/^#[0-9a-fA-F]{3,6}$/.test(v)) resolved[name] = v;
  }
  return resolved;
}

// --- The pairs (design_tokens §7). [foreground, background, minRatio, note] -
const PAIRS = [
  ['--ink', '--bg', 4.5, 'body text on paper'],
  ['--ink', '--surface', 4.5, 'body text on cards'],
  ['--ink-soft', '--bg', 4.5, 'secondary text on paper'],
  ['--muted', '--bg', 4.5, 'muted text on paper'],
  ['--muted', '--surface', 4.5, 'muted text on cards'],
  ['--accent-text', '--bg', 4.5, 'green links/text on paper'],
  ['--accent-text', '--surface', 4.5, 'green links/text on cards'],
  ['--ink', '--tint-mint', 4.5, 'text on mint tint'],
  ['--ink', '--tint-sand', 4.5, 'text on sand tint'],
  ['--ink', '--tint-sky', 4.5, 'text on sky tint'],
  ['--dark-ink', '--dark', 4.5, 'text on dark bands'],
  ['--dark-ink', '--dark-soft', 4.5, 'text on dark-soft'],
  ['--accent-bright', '--dark', 4.5, 'green text on dark'],
  // Non-text UI ≥3:1 (focus rings, large-UI/icon accent)
  ['--focus-ring', '--bg', 3, 'focus ring on paper'],
  ['--focus-ring', '--surface', 3, 'focus ring on cards'],
  ['--focus-ring-dark', '--dark', 3, 'focus ring on dark'],
  ['--accent', '--dark', 3, 'accent fill/icon on dark'],
];

const css = await readFile(TOKENS, 'utf8');
const tokens = parseTokens(css);

let failed = 0;
const rows = [];
for (const [fg, bg, min, note] of PAIRS) {
  if (!tokens[fg] || !tokens[bg]) {
    rows.push(`  ✗ ${fg} on ${bg} — token not found or not a solid hex`);
    failed++;
    continue;
  }
  const ratio = contrast(hexToRgb(tokens[fg]), hexToRgb(tokens[bg]));
  const ok = ratio >= min;
  if (!ok) failed++;
  rows.push(`  ${ok ? '✓' : '✗'} ${ratio.toFixed(2).padStart(5)}:1  (need ${min})  ${fg} on ${bg}  — ${note}`);
}

console.log('Contrast check (design_tokens §7):');
console.log(rows.join('\n'));
if (failed) {
  console.error(`\n✗ ${failed} contrast pair(s) below the required ratio. Darken the token and re-run.`);
  process.exit(1);
}
console.log(`\n✓ all ${PAIRS.length} token pairs pass.`);
