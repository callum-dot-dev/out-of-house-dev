// Postgres access for the worker (mirrors apps/api/src/lib/db.ts).
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL not set');
    pool = new Pool({ connectionString, max: Number(process.env.PG_POOL_MAX ?? 8) });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  const res = await getPool().query<T>(text, params as unknown[]);
  return { rows: res.rows, rowCount: res.rowCount ?? 0 };
}

export async function one<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<T | null> {
  const { rows } = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const out = await fn(client);
    await client.query('commit');
    return out;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
