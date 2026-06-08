import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
});

/** Strip anything that looks like a secret before logging agent/process output. */
export function scrubSecrets(text: string): string {
  return text
    .replace(/\b(sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{20,}|rnd_[A-Za-z0-9]{12,}|whsec_[A-Za-z0-9]{12,})\b/g, '[redacted]')
    .replace(/(authorization|x-api-key|bearer)\s*[:=]\s*\S+/gi, '$1 [redacted]');
}
