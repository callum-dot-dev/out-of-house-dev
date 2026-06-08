// Realtime fan-out for SSE. notify()/jobs publish via Postgres NOTIFY on the
// `ooh_user` channel; a single LISTEN connection per process bridges those into
// an in-process EventEmitter that the SSE endpoint subscribes to. One delivery
// path => no duplicates, and jobs in another process reach connected clients.
import { EventEmitter } from 'node:events';
import type { PoolClient } from 'pg';
import { getPool, query } from './db';

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const CHANNEL = 'ooh_user';

export type UserEvent = { type: string; [k: string]: unknown };

export function onUserEvent(userId: string, cb: (payload: UserEvent) => void): () => void {
  const handler = (p: UserEvent) => cb(p);
  emitter.on(`user:${userId}`, handler);
  return () => emitter.off(`user:${userId}`, handler);
}

/** Publish an event to a user across processes (NOTIFY -> bridge -> emitter). */
export async function publishToUser(userId: string, payload: UserEvent): Promise<void> {
  await query('select pg_notify($1, $2)', [CHANNEL, JSON.stringify({ user_id: userId, ...payload })]);
}

let listenClient: PoolClient | null = null;

export async function startRealtimeBridge(): Promise<void> {
  if (listenClient) return;
  const client = await getPool().connect();
  listenClient = client;
  client.on('notification', (msg) => {
    if (msg.channel !== CHANNEL || !msg.payload) return;
    try {
      const parsed = JSON.parse(msg.payload) as { user_id: string } & UserEvent;
      const { user_id: userId, ...rest } = parsed;
      emitter.emit(`user:${userId}`, rest);
    } catch {
      /* ignore malformed payloads */
    }
  });
  await client.query(`listen ${CHANNEL}`);
}

export async function stopRealtimeBridge(): Promise<void> {
  if (!listenClient) return;
  try {
    await listenClient.query(`unlisten ${CHANNEL}`);
  } catch {
    /* ignore */
  }
  listenClient.release();
  listenClient = null;
}
