import { one } from '../lib/db';
import { publishToUser } from '../lib/realtime';
import { queueEmail } from './email';

export type NotifyInput = { kind: string; title: string; body?: string; link?: string };

export async function notify(userId: string, n: NotifyInput): Promise<void> {
  const row = await one(
    'insert into notifications(user_id, kind, title, body, link) values ($1,$2,$3,$4,$5) returning *',
    [userId, n.kind, n.title, n.body ?? null, n.link ?? null],
  );
  await publishToUser(userId, { type: 'notification', notification: row });

  const u = await one<{ notify_email: boolean; email: string }>(
    'select notify_email, email from users where id=$1',
    [userId],
  );
  if (u?.notify_email) {
    await queueEmail({ to: u.email, template: 'notification', subject: n.title, text: n.body ?? n.title });
  }
}
