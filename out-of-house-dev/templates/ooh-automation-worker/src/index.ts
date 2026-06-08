// Automation worker starter — pattern: ingest → reason → act → notify.
// Replace the steps below with the workflow from the project handoff. Every
// external write should be idempotent (key on the input hash) and dry-run-able.
import { z } from 'zod';

const InputSchema = z.object({ id: z.string(), payload: z.record(z.unknown()) });
export type Input = z.infer<typeof InputSchema>;

export async function ingest(raw: unknown): Promise<Input> {
  return InputSchema.parse(raw);
}

export async function reason(input: Input): Promise<{ decision: string; confidence: number }> {
  // Plug the LLM step here (strict JSON output, deterministic parser, eval set).
  return { decision: 'noop', confidence: 1 };
}

export async function act(_input: Input, decision: { decision: string }): Promise<void> {
  if (process.env.DRY_RUN === 'true') return;
  void decision; // perform the idempotent write
}

export async function run(raw: unknown): Promise<{ ok: boolean }> {
  const input = await ingest(raw);
  const decision = await reason(input);
  await act(input, decision);
  return { ok: true };
}

if (require.main === module) {
  run({ id: 'demo', payload: {} })
    .then((r) => console.log('worker ok', r))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
