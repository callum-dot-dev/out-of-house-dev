// Notification + activity helpers for the worker (mirror the API services so
// jobs can write to the same surfaces; SSE reaches connected clients via the
// API's LISTEN bridge on the shared `ooh_user` channel).
import { one, query } from './db';

export async function notify(userId: string, n: { kind: string; title: string; body?: string; link?: string }): Promise<void> {
  const row = await one('insert into notifications(user_id, kind, title, body, link) values ($1,$2,$3,$4,$5) returning *', [userId, n.kind, n.title, n.body ?? null, n.link ?? null]);
  try {
    await query('select pg_notify($1,$2)', ['ooh_user', JSON.stringify({ user_id: userId, type: 'notification', notification: row })]);
  } catch {
    /* notify is best-effort */
  }
}

export async function activity(projectId: string | null, requestId: string | null, kind: string, title: string, body?: string): Promise<void> {
  await query('insert into activity_events(project_id, request_id, kind, title, body) values ($1,$2,$3,$4,$5)', [projectId, requestId, kind, title, body ?? null]);
}
