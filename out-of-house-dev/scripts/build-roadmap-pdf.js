#!/usr/bin/env node
/* eslint-disable no-console */
//
// Generates docs/roadmap/out-of-house-dev-roadmap.pdf from the HTML in the
// same folder, using whichever Chrome / Edge / Brave binary the host has.
// No npm dependency — uses headless --print-to-pdf.
//
// Usage:
//   node scripts/build-roadmap-pdf.js                         # default v3 roadmap
//   node scripts/build-roadmap-pdf.js path/to.html path/to.pdf  # any doc

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULT_HTML = path.resolve(__dirname, '..', 'docs', 'roadmap', 'out-of-house-dev-roadmap.html');
const DEFAULT_PDF  = path.resolve(__dirname, '..', 'docs', 'roadmap', 'out-of-house-dev-roadmap.pdf');

const argHtml = process.argv[2];
const argPdf  = process.argv[3];
const HTML = argHtml ? path.resolve(argHtml) : DEFAULT_HTML;
const PDF  = argPdf  ? path.resolve(argPdf)  : (argHtml ? HTML.replace(/\.html?$/i, '.pdf') : DEFAULT_PDF);

if (!fs.existsSync(HTML)) {
  console.error(`Missing HTML at ${HTML}`);
  process.exit(1);
}

const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

const browser = candidates.find((c) => c && fs.existsSync(c));
if (!browser) {
  console.error('No Chrome / Edge / Brave / Chromium found. Open the HTML and "Save as PDF" from your browser.');
  console.error(`HTML: ${HTML}`);
  process.exit(0);
}

const args = [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  '--no-margins',
  `--print-to-pdf=${PDF}`,
  `file:///${HTML.replace(/\\/g, '/')}`,
];

console.log(`Rendering PDF via ${browser}`);
const res = spawnSync(browser, args, { stdio: 'inherit' });
if (res.status !== 0) {
  console.error(`Browser exited with status ${res.status}`);
  process.exit(res.status || 1);
}

if (!fs.existsSync(PDF)) {
  console.error('PDF was not produced. Try opening the HTML in your browser and using Print → Save as PDF.');
  process.exit(1);
}
console.log(`Wrote ${PDF}`);
