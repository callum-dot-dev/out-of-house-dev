// Outbound email funnels through here: an email_events row per send, plus an
// in-memory capture buffer (used by tests and, until Phase 4 wires Resend, by
// the dry-run drain). The actual Resend send / .eml write lands in Phase 4.
import { query } from '../lib/db';

export type SentEmail = {
  to: string;
  template: string;
  subject?: string;
  text?: string;
  html?: string;
  meta?: Record<string, unknown>;
  ref?: { kind: string; id: string };
};

const captured: SentEmail[] = [];

export function getSentEmails(): readonly SentEmail[] {
  return captured;
}

export function clearSentEmails(): void {
  captured.length = 0;
}

export async function queueEmail(email: SentEmail): Promise<void> {
  await query(
    'insert into email_events(to_email, template, status, ref_kind, ref_id) values ($1,$2,$3,$4,$5)',
    [email.to, email.template, 'queued', email.ref?.kind ?? null, email.ref?.id ?? null],
  );
  captured.push(email);
}
