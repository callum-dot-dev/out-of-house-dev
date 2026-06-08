// Certificate issuance (ported from supabase/functions/cert-issue). Idempotent
// per enrollment. PDF render is queued in Phase 6.
import { one } from '../lib/db';
import { queueEmail } from './email';
import { notify } from './notifications';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rnd = (n: number): string =>
  Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
const newCode = (): string => `OH-${rnd(4)}-${rnd(4)}-${rnd(2)}`;

export type IssueResult =
  | { error: string }
  | { reused?: boolean; certificate: Record<string, unknown> };

export async function issueCertificate(enrollmentId: string, grade?: string): Promise<IssueResult> {
  const enr = await one<{ user_id: string; programme_id: string; programme_name: string; certificate: boolean }>(
    `select e.user_id, e.programme_id, p.name as programme_name, p.certificate
       from enrollments e join programmes p on p.id = e.programme_id where e.id=$1`,
    [enrollmentId],
  );
  if (!enr) return { error: 'enrollment not found' };
  if (!enr.certificate) return { error: 'programme does not issue certificates' };

  const existing = await one<Record<string, unknown>>(
    'select id, certificate_code, verification_url from certificates where enrollment_id=$1',
    [enrollmentId],
  );
  if (existing) return { reused: true, certificate: existing };

  const code = newCode();
  const base = process.env.PUBLIC_SITE_URL ?? 'https://out-of-house.dev';
  const verificationUrl = `${base}/verify/${code}`;
  const cert = await one<Record<string, unknown>>(
    `insert into certificates(enrollment_id, user_id, programme_id, certificate_code, verification_url, grade)
       values ($1,$2,$3,$4,$5,$6) returning *`,
    [enrollmentId, enr.user_id, enr.programme_id, code, verificationUrl, grade ?? 'Pass'],
  );
  await one("update enrollments set status='completed', completed_at=now() where id=$1 returning id", [enrollmentId]);

  const u = await one<{ email: string }>('select email from users where id=$1', [enr.user_id]);
  if (u) {
    await queueEmail({ to: u.email, template: 'certificate-issued', subject: 'Your certificate is ready', text: `Verify at ${verificationUrl}`, meta: { code } });
  }
  await notify(enr.user_id, { kind: 'certificate', title: 'Certificate issued', body: enr.programme_name, link: verificationUrl });
  return { certificate: cert as Record<string, unknown> };
}
