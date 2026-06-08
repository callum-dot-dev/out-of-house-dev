// Thin pg-boss client for the API: enqueue a manual job run. Lazily started so
// API tests that never trigger a job don't spin up pg-boss.
import PgBoss from 'pg-boss';

let boss: PgBoss | null = null;

async function getBoss(): Promise<PgBoss> {
  if (!boss) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL not set');
    boss = new PgBoss({ connectionString, schema: 'pgboss' });
    boss.on('error', () => undefined);
    await boss.start();
  }
  return boss;
}

export async function triggerJob(name: string, data: Record<string, unknown> = {}): Promise<string | null> {
  const b = await getBoss();
  try {
    await b.createQueue(name);
  } catch {
    /* exists */
  }
  return b.send(name, data, {});
}

export async function closeJobsClient(): Promise<void> {
  if (boss) {
    await boss.stop({ graceful: false, wait: false });
    boss = null;
  }
}
