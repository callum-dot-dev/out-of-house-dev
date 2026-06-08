// LLM access for jobs. Degrades to null when no key is configured (so handlers
// fall back to deterministic heuristics and the runtime stays green without
// credentials). Persists usage to llm_calls when it does run.
import type { LlmRequest, LlmResponse } from '@oohdev/shared';
import { query } from './db';

export async function maybeLlm(req: LlmRequest): Promise<LlmResponse | null> {
  const model = req.model ?? 'claude-haiku-4-5-20251001';
  const isAnthropic = model.startsWith('claude');
  if (isAnthropic && !process.env.ANTHROPIC_API_KEY) return null;
  if (!isAnthropic && !process.env.OPENAI_API_KEY) return null;

  const { llm } = await import('@oohdev/shared');
  return llm(req, {
    persist: async (u) => {
      try {
        await query(
          'insert into llm_calls(purpose, model, tokens_in, tokens_out, cost_pence, ref_kind, ref_id) values ($1,$2,$3,$4,$5,$6,$7)',
          [u.purpose, u.model, u.tokens_in, u.tokens_out, Math.round(u.cost_gbp * 100), u.ref?.kind ?? null, u.ref?.id ?? null],
        );
      } catch {
        /* never break the call on accounting */
      }
    },
  });
}
