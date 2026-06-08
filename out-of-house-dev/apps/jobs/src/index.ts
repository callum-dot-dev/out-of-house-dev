// Worker entrypoint: start pg-boss, register every job consumer, apply the
// Appendix B schedules. pg-boss keeps the process alive.
import './registry';
import { startBoss } from './boss';
import { ALL_JOBS, registerWorker } from './defineJob';
import { applySchedules, SCHEDULES } from './schedules';
import { logger } from './lib/log';

async function main(): Promise<void> {
  await startBoss();
  for (const def of ALL_JOBS) await registerWorker(def);
  await applySchedules();
  logger.info({ jobs: ALL_JOBS.length, schedules: SCHEDULES.length }, 'jobs worker started');
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
