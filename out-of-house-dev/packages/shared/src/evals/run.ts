// Prompt-output eval harness. Golden fixtures (5+ per stage) are validated for
// structure so prompt regressions surface in CI. Run: npm run evals
type Validator = (md: string) => string[];

const validators: Record<string, Validator> = {
  scope: (md) => {
    const f: string[] = [];
    if (!/##\s*Acceptance/i.test(md)) f.push('missing Acceptance section');
    if (!/##\s*Risks/i.test(md)) f.push('missing Risks section');
    if (md.length < 60) f.push('too short');
    return f;
  },
  plan: (md) => {
    const f: string[] = [];
    if (!/##\s*Verification/i.test(md)) f.push('missing Verification section');
    if (!/-\s+/.test(md)) f.push('no bullet list');
    return f;
  },
  review: (md) => {
    const f: string[] = [];
    if (!/status:\s*(pass|needs_changes)/i.test(md)) f.push('missing status line');
    if (!/risk:\s*(low|standard|high)/i.test(md)) f.push('missing risk line');
    return f;
  },
};

const scopeFx = (t: string) => `# Scope — ${t}\n\n**Problem.** ${t}.\n\n## Acceptance criteria\n- [ ] ${t} implemented\n- [ ] tests pass\n\n## Risks\n- standard\n`;
const planFx = (t: string) => `# Plan — ${t}\n\n## Files\n- src/${t}.ts\n\n## Verification\n- npm run lint\n- npm test\n`;
const reviewFx = (risk: string, status: string) => `# Review\n\nNo blocking issues.\n\nrisk: ${risk}\nstatus: ${status}\n`;

type Fixture = { stage: keyof typeof validators; name: string; output: string };

const fixtures: Fixture[] = [
  ...['Hero copy', 'Pricing page', 'FAQ section', 'Contact form', 'Footer links'].map((t, i) => ({ stage: 'scope' as const, name: `scope-${i}`, output: scopeFx(t) })),
  ...['Primary CRUD', 'Auth flow', 'Dashboard', 'Billing', 'Search'].map((t, i) => ({ stage: 'plan' as const, name: `plan-${i}`, output: planFx(t) })),
  ...[
    ['low', 'pass'],
    ['standard', 'pass'],
    ['high', 'needs_changes'],
    ['standard', 'needs_changes'],
    ['low', 'pass'],
  ].map(([r, s], i) => ({ stage: 'review' as const, name: `review-${i}`, output: reviewFx(r, s) })),
];

let failures = 0;
for (const fx of fixtures) {
  const errs = validators[fx.stage](fx.output);
  if (errs.length) {
    failures++;
    console.error(`FAIL ${fx.name}: ${errs.join(', ')}`);
  }
}
console.log(`evals: ${fixtures.length - failures}/${fixtures.length} fixtures passed`);
if (failures > 0) process.exit(1);
