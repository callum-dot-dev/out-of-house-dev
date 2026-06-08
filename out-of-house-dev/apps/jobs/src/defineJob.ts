// Typed job definition + pg-boss worker registration. Every job validates its
// payload (zod), logs start/finish, retries with backoff, and writes an
// admin_alert on final failure.
import type { z } from 'zod';
import { getBoss } from './boss';
import { query } from './lib/db';
import { logger } from './lib/log';

export type JobOpts = { retryLimit?: number; retryDelay?: number; retryBackoff?: boolean };
export type JobDef<T> = {
  name: string;
  schema: z.ZodType<T>;
  handler: (data: T) => Promise<unknown>;
  opts: Required<JobOpts>;
};

export const ALL_JOBS: JobDef<unknown>[] = [];

export function defineJob<T>(
  name: string,
  schema: z.ZodType<T>,
  handler: (data: T) => Promise<unknown>,
  opts: JobOpts = {},
): JobDef<T> {
  const def: JobDef<T> = {
    name,
    schema,
    handler,
    opts: { retryLimit: 2, retryDelay: 5, retryBackoff: true, ...opts },
  };
  ALL_JOBS.push(def as unknown as JobDef<unknown>);
  return def;
}

/** Run a job's handler directly (used by tests + the admin manual-trigger). */
export async function runJobHandler<T>(def: JobDef<T>, rawData: unknown): Promise<unknown> {
  const data = def.schema.parse(rawData ?? {});
  return def.handler(data);
}

export async function registerWorker(def: JobDef<unknown>): Promise<void> {
  const boss = getBoss();
  try {
    await boss.createQueue(def.name);
  } catch {
    /* queue already exists */
  }
  await boss.work(def.name, { batchSize: 1, includeMetadata: true }, async (jobs: unknown) => {
    const arr = Array.isArray(jobs) ? jobs : [jobs];
    for (const job of arr as Array<{ data: unknown; retryCount?: number; retrycount?: number }>) {
      const t0 = Date.now();
      try {
        await runJobHandler(def, job.data);
        logger.info({ job: def.name, ms: Date.now() - t0 }, 'job.ok');
      } catch (err) {
        const retryCount = Number(job.retryCount ?? job.retrycount ?? 0);
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ job: def.name, retryCount, err: message }, 'job.failed');
        if (retryCount >= def.opts.retryLimit) {
          await query(
            "insert into admin_alerts(severity, kind, title, body) values ('critical','job_failed',$1,$2)",
            [`Job failed: ${def.name}`, message.slice(0, 1000)],
          ).catch(() => undefined);
        }
        throw err;
      }
    }
  });
}

export async function enqueue(name: string, data: Record<string, unknown> = {}): Promise<void> {
  const boss = getBoss();
  const def = ALL_JOBS.find((d) => d.name === name);
  await boss.send(name, data, def ? { retryLimit: def.opts.retryLimit, retryDelay: def.opts.retryDelay, retryBackoff: def.opts.retryBackoff } : {});
}
