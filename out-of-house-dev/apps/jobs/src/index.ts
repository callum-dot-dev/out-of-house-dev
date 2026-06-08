// apps/jobs — background worker (pg-boss consumers + cron schedules).
// Phase 0 scaffold only; pg-boss bootstrap, defineJob(), and the Appendix B
// schedule table arrive in Phase 4.

function main(): void {
  console.log('[jobs] scaffold up — pg-boss queues + schedules wired in Phase 4');
  // Keep the worker process alive (Render workers must not exit).
  setInterval(() => undefined, 1 << 30);
}

main();
