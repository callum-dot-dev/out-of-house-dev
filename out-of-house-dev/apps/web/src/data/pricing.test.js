import { computeQuote, addonsFor, CARE_MONTHLY, getBuildType } from './pricing';

// The eight binding acceptance values from pricing_review §2 / PHASE_B §B5.
// oneOff is the figure quoted in the brief; monthly is the care ladder.
describe('computeQuote — pricing_review §2 acceptance values', () => {
  const cases = [
    ['8-page site + CMS = £1,350', { type: 'website', units: 8, addons: { cms: true } }, 1350],
    ['15p + CMS + AI = £3,000', { type: 'website', units: 15, addons: { cms: true, ai: true } }, 3000],
    ['3 workflows = £1,550', { type: 'automation', units: 3, addons: {} }, 1550],
    ['10 workflows = £4,350', { type: 'automation', units: 10, addons: {} }, 4350],
    ['5-feature webapp + auth + AI = £7,900', { type: 'webapp', units: 5, addons: { auth: true, ai: true } }, 7900],
    ['10-feature + all add-ons = £11,300', { type: 'webapp', units: 10, addons: { care: true, ai: true, auth: true, cms: true } }, 11300],
    ['4-module custom + auth = £6,800', { type: 'custom', units: 4, addons: { auth: true } }, 6800],
    ['10-module + all = £12,600', { type: 'custom', units: 10, addons: { care: true, ai: true, auth: true, cms: true } }, 12600],
  ];
  test.each(cases)('%s', (_label, input, expected) => {
    expect(computeQuote(input).oneOff).toBe(expected);
  });
});

describe('computeQuote — care ladder monthly (pricing_review §1b)', () => {
  test('care monthly is per build type', () => {
    expect(computeQuote({ type: 'website', units: 1, addons: { care: true } }).monthly).toBe(100);
    expect(computeQuote({ type: 'automation', units: 1, addons: { care: true } }).monthly).toBe(150);
    expect(computeQuote({ type: 'webapp', units: 1, addons: { care: true } }).monthly).toBe(300);
    expect(computeQuote({ type: 'custom', units: 1, addons: { care: true } }).monthly).toBe(400);
    expect(CARE_MONTHLY).toEqual({ website: 100, automation: 150, webapp: 300, custom: 400 });
  });
  test('AI add-on is £0/mo (usage billed at cost, not in the estimate)', () => {
    expect(computeQuote({ type: 'webapp', units: 1, addons: { ai: true } }).monthly).toBe(0);
  });
});

describe('computeQuote — base includes bundled units', () => {
  test('website base £500 includes 5 pages (1-5 pages all £500)', () => {
    for (let p = 1; p <= 5; p += 1) {
      expect(computeQuote({ type: 'website', units: p, addons: {} }).oneOff).toBe(500);
    }
    expect(computeQuote({ type: 'website', units: 6, addons: {} }).oneOff).toBe(650); // first extra page
  });
  test('webapp floor is £4,000 (1 feature)', () => {
    expect(computeQuote({ type: 'webapp', units: 1, addons: {} }).oneOff).toBe(4000);
  });
  test('automation floor £750, custom floor £3,500', () => {
    expect(computeQuote({ type: 'automation', units: 1, addons: {} }).oneOff).toBe(750);
    expect(computeQuote({ type: 'custom', units: 1, addons: {} }).oneOff).toBe(3500);
  });
});

describe('computeQuote — add-on visibility rules (pricing_review §1c)', () => {
  test('AI and CMS do not apply to automation even if toggled', () => {
    const withAll = computeQuote({ type: 'automation', units: 3, addons: { ai: true, cms: true, auth: true } });
    const authOnly = computeQuote({ type: 'automation', units: 3, addons: { auth: true } });
    expect(withAll.oneOff).toBe(authOnly.oneOff); // ai/cms ignored → only auth (+£900)
    expect(withAll.oneOff).toBe(1550 + 900);
  });
  test('addonsFor hides AI + CMS for automation, shows them elsewhere', () => {
    expect(addonsFor('automation').map((a) => a.id).sort()).toEqual(['auth', 'care']);
    expect(addonsFor('website').map((a) => a.id).sort()).toEqual(['ai', 'auth', 'care', 'cms']);
  });
  test('auth is available for automation', () => {
    expect(addonsFor('automation').some((a) => a.id === 'auth')).toBe(true);
  });
});

describe('computeQuote — slider bounds', () => {
  test('units clamp to the build type min/max', () => {
    expect(getBuildType('website').max).toBe(15);
    expect(computeQuote({ type: 'website', units: 99, addons: {} }).oneOff)
      .toBe(computeQuote({ type: 'website', units: 15, addons: {} }).oneOff);
    expect(computeQuote({ type: 'website', units: 0, addons: {} }).oneOff)
      .toBe(computeQuote({ type: 'website', units: 1, addons: {} }).oneOff);
  });
  test('unknown type yields zero', () => {
    expect(computeQuote({ type: 'nope', units: 3, addons: {} })).toEqual({ oneOff: 0, monthly: 0 });
  });
});
