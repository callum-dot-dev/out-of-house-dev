// Builder worker entrypoint: consume builder.run / builder.merge / pdf.render
// from the shared pg-boss queue. Global concurrency from BUILDER_CONCURRENCY.
import PgBoss from 'pg-boss';
import { z } from 'zod';
import { runBuild, type BuildPayload } from './runner';
import { runMerge } from './merge';
import { renderPdf, type TemplateName } from './pdf';
import { logger } from './lib/log';

const buildSchema = z.object({
  repo_url: z.string(),
  branch: z.string(),
  prompt: z.string(),
  claude_run_id: z.string().uuid().optional(),
  request_id: z.string().uuid().optional(),
  base: z.string().optional(),
});
const mergeSchema = z.object({ pr_url: z.string(), branch: z.string().optional() });
const pdfSchema = z.object({ template: z.enum(['certificate', 'monthly-report', 'aiseo-report', 'quote-sow']), data: z.record(z.unknown()), outPath: z.string() });

const arr = (jobs: unknown): Array<{ data: unknown }> => (Array.isArray(jobs) ? jobs : [jobs]) as Array<{ data: unknown }>;

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not set');
  const boss = new PgBoss({ connectionString, schema: 'pgboss' });
  boss.on('error', () => undefined);
  await boss.start();

  const concurrency = Number(process.env.BUILDER_CONCURRENCY ?? 2);
  for (const q of ['builder.run', 'builder.merge', 'pdf.render']) {
    try {
      await boss.createQueue(q);
    } catch {
      /* exists */
    }
  }

  // Global concurrency cap is enforced by running BUILDER_CONCURRENCY worker
  // replicas on Render; pg-boss serialises per-replica here.
  await boss.work('builder.run', { batchSize: 1, includeMetadata: true }, async (jobs) => {
    for (const j of arr(jobs)) await runBuild(buildSchema.parse(j.data) as BuildPayload);
  });
  await boss.work('builder.merge', { batchSize: 1 }, async (jobs) => {
    for (const j of arr(jobs)) await runMerge(mergeSchema.parse(j.data));
  });
  await boss.work('pdf.render', { batchSize: 1 }, async (jobs) => {
    for (const j of arr(jobs)) {
      const d = pdfSchema.parse(j.data);
      await renderPdf(d.template as TemplateName, d.data, d.outPath);
    }
  });

  logger.info({ concurrency }, 'builder worker started');
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
