// Single source of calculator pricing truth (moved out of PricingCalculator.js
// per FRONTEND_DESIGN_PROMPT §1 / pricing_review §1e). Every number here is the
// post-review figure from docs/content/pricing_review.md §1 — the acceptance
// values in pricing.test.js are the binding contract.

// Build types. `includes` = units bundled into `base`; each unit beyond that
// costs `perUnit`.  oneOff = base + max(0, units − includes) × perUnit.
//  - website:    £500 includes 5 pages (pricing_review §1a — matches the
//                homepage Starter card "up to 5 pages … £500"); +£150/page.
//  - automation: £750 includes 1 workflow; +£400/workflow (unchanged).
//  - webapp:     £4,000 base (was £2,500 — §1a raises it to the committed floor).
//  - custom:     £3,500 includes 1 module; +£800/module (unchanged).
export const BUILD_TYPES = [
  { id: 'website',    label: 'Website',         unit: 'page',     base: 500,  perUnit: 150, includes: 5, min: 1, max: 15, sub: 'from £500' },
  { id: 'automation', label: 'AI automation',   unit: 'workflow', base: 750,  perUnit: 400, includes: 1, min: 1, max: 10, sub: 'from £750' },
  { id: 'webapp',     label: 'Web app / MVP',   unit: 'feature',  base: 4000, perUnit: 600, includes: 1, min: 1, max: 10, sub: 'from £4,000' },
  { id: 'custom',     label: 'Custom software', unit: 'module',   base: 3500, perUnit: 800, includes: 1, min: 1, max: 10, sub: 'from £3,500' },
];

// Care ladder (pricing_review §1b) — replaces the old flat £100/mo add-on.
// Per build type; care keeps it running (the retainer, from £1,500/mo, keeps it
// shipping — kept distinct in copy).
export const CARE_MONTHLY = { website: 100, automation: 150, webapp: 300, custom: 400 };

// Add-ons. `appliesTo` encodes the §1c visibility rules: AI features and CMS are
// hidden for `automation` (the build already IS AI; CMS is meaningless there).
// Auth & payments is valid for all four, including automation.
export const ADDONS = [
  {
    id: 'care', label: 'Care & monitoring',
    detail: 'We host it, patch it, watch it, and fix the small stuff',
    oneOff: 0, care: true, appliesTo: ['website', 'automation', 'webapp', 'custom'],
  },
  {
    id: 'ai', label: 'Built-in AI features',
    detail: 'AI-powered features baked into the product. Model usage billed at cost — typically £10–£50/month.',
    oneOff: 600, monthly: 0, appliesTo: ['website', 'webapp', 'custom'],
  },
  {
    id: 'auth', label: 'Auth and payments',
    detail: 'User accounts, Stripe checkout, subscriptions',
    oneOff: 900, monthly: 0, appliesTo: ['website', 'automation', 'webapp', 'custom'],
  },
  {
    id: 'cms', label: 'CMS / content editing',
    detail: 'Update copy and images without us',
    oneOff: 400, monthly: 0, appliesTo: ['website', 'webapp', 'custom'],
  },
];

export const SCOPE_LABELS = {
  website:    (n) => `${n} page${n === 1 ? '' : 's'}`,
  automation: (n) => `${n} workflow${n === 1 ? '' : 's'}`,
  webapp:     (n) => `${n} core feature${n === 1 ? '' : 's'}`,
  custom:     (n) => `${n} module${n === 1 ? '' : 's'}`,
};

export const formatGBP = (n) => '£' + Number(n).toLocaleString('en-GB');

export const getBuildType = (type) => BUILD_TYPES.find((b) => b.id === type);

// Add-ons visible for a given build type (the §1c visibility rules).
export const addonsFor = (type) => ADDONS.filter((a) => a.appliesTo.includes(type));

// The pure pricing function — the calculator and its tests both call this, so
// the UI can never drift from the acceptance values.
export function computeQuote({ type, units, addons = {} }) {
  const bt = getBuildType(type);
  if (!bt) return { oneOff: 0, monthly: 0 };
  const u = Math.min(bt.max, Math.max(bt.min, Number(units) || bt.min));
  let oneOff = bt.base + Math.max(0, u - bt.includes) * bt.perUnit;
  let monthly = 0;
  for (const a of ADDONS) {
    if (!addons[a.id]) continue;
    if (!a.appliesTo.includes(type)) continue; // ignore add-ons invalid for this type
    oneOff += a.oneOff || 0;
    monthly += a.care ? (CARE_MONTHLY[type] || 0) : (a.monthly || 0);
  }
  return { oneOff, monthly };
}

// Guard line shown directly above the calculator (home.md §09 / pricing_review §1d).
export const CALCULATOR_GUARD =
  'These estimates cover the scopes most projects land in. Bigger builds — complex '
  + 'automations up to ~£20k, custom systems up to ~£50k — get a fixed quote on a call, '
  + 'within 24 hours.';
