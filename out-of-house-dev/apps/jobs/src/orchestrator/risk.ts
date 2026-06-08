// Risk classification from a PR's changed files + size. high = anything touching
// auth/billing/permissions/migrations/email/destructive ops (never auto-merged);
// low = copy/content/style-token/doc-only small diffs; standard = everything else.
export type Risk = 'low' | 'standard' | 'high';

const HIGH_PATTERNS = [
  /auth/i,
  /login/i,
  /password/i,
  /session/i,
  /billing/i,
  /payment/i,
  /stripe/i,
  /webhook/i,
  /secret/i,
  /permission/i,
  /migration/i,
  /\.sql$/i,
  /email/i,
  /\boauth\b/i,
];

const CONTENT_EXT = /\.(md|mdx|txt|json|ya?ml|css|scss|svg|png|jpe?g|webp|ico|gif)$/i;
const CONTENT_DIR = /(^|\/)(content|copy|docs|posts|blog)\//i;

export function classifyRisk(files: string[], additions = 0): Risk {
  if (files.some((f) => HIGH_PATTERNS.some((re) => re.test(f)))) return 'high';
  const contentOnly = files.length > 0 && files.every((f) => CONTENT_EXT.test(f) || CONTENT_DIR.test(f));
  if (contentOnly && additions < 200) return 'low';
  return 'standard';
}
