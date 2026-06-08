import { query } from '../lib/db';
import type { Viewer } from '../types';

export async function audit(
  viewer: Viewer | null,
  action: string,
  target?: { table?: string | null; id?: string | null },
  payload?: Record<string, unknown>,
  ip?: string | null,
): Promise<void> {
  await query(
    'insert into audit_events(actor_id, action, target_table, target_id, payload, ip) values ($1,$2,$3,$4,$5,$6)',
    [viewer?.id ?? null, action, target?.table ?? null, target?.id ?? null, JSON.stringify(payload ?? {}), ip ?? null],
  );
}
