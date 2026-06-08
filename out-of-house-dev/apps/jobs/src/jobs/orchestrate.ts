import { z } from 'zod';
import { defineJob } from '../defineJob';
import { runStage } from '../orchestrator';

const prSchema = z.object({
  pr_url: z.string().optional(),
  files: z.array(z.string()),
  additions: z.number().optional(),
  ci: z.enum(['green', 'red', 'unknown']).optional(),
});

// request_id/kind optional so the cron sweep / empty-payload health check is a
// no-op; real runs pass both (enqueued by the API on request transitions, or by
// the builder worker callback on PR open).
export const orchestrateStage = defineJob(
  'orchestrate.stage',
  z.object({
    request_id: z.string().uuid().optional(),
    kind: z.enum(['scope', 'quote', 'plan', 'build_prompt', 'review', 'deploy']).optional(),
    force: z.boolean().optional(),
    pr: prSchema.optional(),
  }),
  async (data) => {
    if (!data.request_id || !data.kind) return { skipped: true };
    return runStage(data.request_id, data.kind, { force: data.force, pr: data.pr });
  },
);
