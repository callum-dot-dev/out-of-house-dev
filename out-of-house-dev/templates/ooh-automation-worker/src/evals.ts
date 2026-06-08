// Eval harness: run fixtures through reason() and score vs expected. Keep the
// accuracy bar in the handoff; fail the build if it regresses.
import { reason, ingest } from './index';

const FIXTURES: Array<{ input: unknown; expect: string }> = [{ input: { id: '1', payload: {} }, expect: 'noop' }];

async function main(): Promise<void> {
  let pass = 0;
  for (const f of FIXTURES) {
    const d = await reason(await ingest(f.input));
    if (d.decision === f.expect) pass++;
  }
  console.log(`evals: ${pass}/${FIXTURES.length}`);
  if (pass < FIXTURES.length) process.exit(1);
}

void main();
