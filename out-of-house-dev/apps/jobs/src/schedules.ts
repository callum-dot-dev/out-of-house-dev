// Single source of truth for cron schedules (spec Appendix B). Europe/London.
import { getBoss } from './boss';

export type Schedule = { job: string; cron: string };

export const SCHEDULES: Schedule[] = [
  { job: 'leads.discover', cron: '*/30 * * * *' },
  { job: 'leads.enrich', cron: '*/15 * * * *' },
  { job: 'leads.score', cron: '*/15 * * * *' },
  { job: 'outreach.draft', cron: '0 * * * *' },
  { job: 'outreach.send', cron: '*/30 8-18 * * 1-5' },
  { job: 'inbox.parse', cron: '*/10 * * * *' },
  { job: 'email.queue_drain', cron: '*/5 * * * *' },
  { job: 'email.sequences', cron: '0 9 * * *' },
  { job: 'reports.digest_weekly', cron: '0 7 * * 1' },
  { job: 'reports.monthly_impact', cron: '0 7 1 * *' },
  { job: 'reports.funnel_weekly', cron: '0 8 * * 1' },
  { job: 'funnel.precall_brief', cron: '*/15 * * * *' },
  { job: 'funnel.expand_loop', cron: '0 9 * * *' },
  { job: 'aiseo.rank_monthly', cron: '0 6 1 * *' },
  { job: 'aiseo.authority_monthly', cron: '0 6 2 * *' },
  { job: 'aiseo.adversarial_monthly', cron: '0 6 3 * *' },
  { job: 'ads.perf_daily', cron: '0 6 * * *' },
  { job: 'ads.rotate_weekly', cron: '0 7 * * 1' },
  { job: 'logovault.usage_rollup', cron: '0 2 * * *' },
  { job: 'logovault.usage_billing', cron: '0 3 1 * *' },
  { job: 'education.session_reminders', cron: '0 * * * *' },
  { job: 'education.cohort_health', cron: '0 8 * * 3' },
  { job: 'ops.retention_sweep', cron: '0 2 * * 0' },
  { job: 'ops.synthetic_hourly', cron: '0 * * * *' },
  { job: 'ops.uptime_check', cron: '*/5 * * * *' },
  { job: 'ops.backup_nightly', cron: '0 1 * * *' },
  { job: 'ops.stripe_reconcile_nightly', cron: '30 1 * * *' },
  { job: 'ops.cost_rollup_daily', cron: '15 1 * * *' },
  { job: 'ops.disk_watch', cron: '*/30 * * * *' },
];

export async function applySchedules(): Promise<void> {
  const boss = getBoss();
  for (const s of SCHEDULES) {
    try {
      await boss.schedule(s.job, s.cron, {}, { tz: 'Europe/London' });
    } catch {
      // queue may not be registered (job not built yet) — skip, will apply next boot
    }
  }
}
