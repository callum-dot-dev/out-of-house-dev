import { one, query } from '../lib/db';
import type { Viewer } from '../types';

export type NotificationRow = { id: string; user_id: string; [k: string]: unknown };

export async function listNotifications(v: Viewer, limit = 100): Promise<NotificationRow[]> {
  return (
    await query<NotificationRow>(
      'select * from notifications where user_id=$1 order by created_at desc limit $2',
      [v.id, limit],
    )
  ).rows;
}

export async function getNotificationScoped(v: Viewer, id: string): Promise<NotificationRow | null> {
  const row = await one<NotificationRow>('select * from notifications where id=$1', [id]);
  if (!row) return null;
  return row.user_id === v.id ? row : null; // notifications are strictly personal
}

export async function markRead(v: Viewer, id: string): Promise<NotificationRow | null> {
  return one<NotificationRow>(
    'update notifications set read_at=now() where id=$1 and user_id=$2 returning *',
    [id, v.id],
  );
}
