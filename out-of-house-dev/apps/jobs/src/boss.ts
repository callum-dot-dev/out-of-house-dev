import PgBoss from 'pg-boss';

let boss: PgBoss | null = null;

export function getBoss(): PgBoss {
  if (!boss) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL not set');
    boss = new PgBoss({ connectionString, schema: 'pgboss' });
    boss.on('error', () => {
      /* pg-boss surfaces transient errors here; jobs handle their own failures */
    });
  }
  return boss;
}

export async function startBoss(): Promise<PgBoss> {
  const b = getBoss();
  await b.start();
  return b;
}

export async function stopBoss(): Promise<void> {
  if (boss) {
    await boss.stop({ graceful: false, wait: false });
    boss = null;
  }
}
