// Environment access + integration-status reporting. The platform rule: a
// missing key degrades the feature gracefully and shows as `missing` on
// /api/v1/admin/health — never a crash.
export const isProd = (): boolean => process.env.NODE_ENV === 'production';
export const isTest = (): boolean => process.env.NODE_ENV === 'test';

export function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export function bool(name: string, fallback = false): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === 'true' || v === '1';
}

/** Secret with a deterministic dev/test fallback; required in production. */
export function secret(name: string): string {
  const v = process.env[name];
  if (v) return v;
  if (isProd()) throw new Error(`Missing required secret ${name} in production`);
  return `dev-insecure-secret-${name}`;
}

export const EMAIL_DRY_RUN = (): boolean => bool('EMAIL_DRY_RUN', true);

const INTEGRATIONS: Record<string, string> = {
  stripe: 'STRIPE_SECRET_KEY',
  resend: 'RESEND_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  github: 'GITHUB_TOKEN',
  render: 'RENDER_API_KEY',
  calcom: 'CALCOM_API_KEY',
  slack: 'SLACK_BOT_TOKEN',
  google_places: 'GOOGLE_PLACES_API_KEY',
  companies_house: 'COMPANIES_HOUSE_API_KEY',
  meta_ads: 'META_ACCESS_TOKEN',
  google_ads: 'GOOGLE_ADS_DEVELOPER_TOKEN',
  perplexity: 'PERPLEXITY_API_KEY',
  google_oauth: 'GOOGLE_OAUTH_CLIENT_ID',
};

export function integrationStatus(): Record<string, 'configured' | 'missing'> {
  const out: Record<string, 'configured' | 'missing'> = {};
  for (const [name, key] of Object.entries(INTEGRATIONS)) {
    out[name] = process.env[key] ? 'configured' : 'missing';
  }
  return out;
}
