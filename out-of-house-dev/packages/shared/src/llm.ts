// LLM router — ported from supabase/functions/_shared/llm.ts.
// Differences from the Deno original:
//   - Deno.env.get -> process.env (Node runtime).
//   - Model ids updated per spec A6 (claude-opus-4-8 for planning/build).
//   - Adds a `purpose` tag + optional persistence/cap hooks injected by callers
//     so every call can be written to the llm_calls table and checked against a
//     daily GBP cap WITHOUT this module importing the DB layer (keeps it a leaf).
//
// This is a leaf module: it only does HTTP + accounting. Callers (the API and
// the workers) supply `hooks` that persist usage and enforce caps.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export type AnthropicModel =
  | 'claude-opus-4-8'
  | 'claude-sonnet-4-6'
  | 'claude-haiku-4-5-20251001';
export type OpenAiModel = 'gpt-4o' | 'gpt-4o-mini';
export type LlmModel = AnthropicModel | OpenAiModel;

/** What the call was for — tagged onto every llm_calls row for cost reporting. */
export type LlmPurpose =
  | 'scope'
  | 'quote'
  | 'plan'
  | 'build_prompt'
  | 'review'
  | 'deploy'
  | 'classify'
  | 'score'
  | 'draft'
  | 'extract'
  | 'summarise'
  | 'rank'
  | 'audit'
  | 'eval'
  | 'other';

export type LlmRequest = {
  system?: string;
  user: string;
  model?: LlmModel;
  max_tokens?: number;
  temperature?: number;
  response_format?: 'json' | 'text';
  /** Tag stored against the usage row; drives per-purpose cost reporting. */
  purpose?: LlmPurpose;
  /** Optional reference back to the entity this call relates to (for llm_calls). */
  ref?: { kind: string; id: string };
};

export type LlmResponse = {
  text: string;
  json?: unknown;
  model: LlmModel;
  tokens_in: number;
  tokens_out: number;
  cost_gbp: number;
};

/** Usage record handed to the persistence hook after every call. */
export type LlmUsage = {
  purpose: LlmPurpose;
  model: LlmModel;
  tokens_in: number;
  tokens_out: number;
  cost_gbp: number;
  ref?: { kind: string; id: string };
};

export type LlmHooks = {
  /** Return false to block the call (e.g. daily GBP cap already breached). */
  withinCap?: (purpose: LlmPurpose) => boolean | Promise<boolean>;
  /** Persist the usage row (llm_calls). Errors here must not break the call. */
  persist?: (usage: LlmUsage) => void | Promise<void>;
};

export class LlmCapError extends Error {
  constructor(public purpose: LlmPurpose) {
    super(`LLM daily cost cap reached for purpose "${purpose}"`);
    this.name = 'LlmCapError';
  }
}

// £ per million tokens, rough Jan 2026 list price.
const ANTHROPIC_PRICE: Record<AnthropicModel, { in: number; out: number }> = {
  'claude-opus-4-8': { in: 12.0, out: 60.0 },
  'claude-sonnet-4-6': { in: 2.4, out: 12.0 },
  'claude-haiku-4-5-20251001': { in: 0.6, out: 3.0 },
};

const OPENAI_PRICE: Record<OpenAiModel, { in: number; out: number }> = {
  'gpt-4o': { in: 2.0, out: 8.0 },
  'gpt-4o-mini': { in: 0.12, out: 0.48 },
};

/** Default model per spec A6 — opus plans/builds, sonnet drafts/reviews, haiku classifies. */
export const DEFAULT_MODEL: Record<LlmPurpose, LlmModel> = {
  plan: 'claude-opus-4-8',
  build_prompt: 'claude-opus-4-8',
  scope: 'claude-sonnet-4-6',
  quote: 'claude-sonnet-4-6',
  review: 'claude-sonnet-4-6',
  draft: 'claude-sonnet-4-6',
  extract: 'claude-sonnet-4-6',
  summarise: 'claude-sonnet-4-6',
  rank: 'claude-sonnet-4-6',
  audit: 'claude-sonnet-4-6',
  deploy: 'claude-haiku-4-5-20251001',
  classify: 'claude-haiku-4-5-20251001',
  score: 'claude-haiku-4-5-20251001',
  eval: 'claude-haiku-4-5-20251001',
  other: 'claude-haiku-4-5-20251001',
};

const safeJson = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    // Tolerate models that wrap JSON in prose / code fences.
    const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        return null;
      }
    }
    const braced = s.match(/[{[][\s\S]*[}\]]/);
    if (braced) {
      try {
        return JSON.parse(braced[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
};

const isAnthropic = (model: LlmModel): model is AnthropicModel => model.startsWith('claude');

export const llm = async (req: LlmRequest, hooks: LlmHooks = {}): Promise<LlmResponse> => {
  const purpose: LlmPurpose = req.purpose ?? 'other';
  const model: LlmModel = req.model ?? DEFAULT_MODEL[purpose];
  const maxTokens = req.max_tokens ?? 1024;
  const temperature = req.temperature ?? 0.3;

  if (hooks.withinCap) {
    const ok = await hooks.withinCap(purpose);
    if (!ok) throw new LlmCapError(purpose);
  }

  let text = '';
  let tokensIn = 0;
  let tokensOut = 0;

  if (isAnthropic(model)) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY not set');
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: req.system,
        messages: [{ role: 'user', content: req.user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    text = data.content?.[0]?.text ?? '';
    tokensIn = data.usage?.input_tokens ?? 0;
    tokensOut = data.usage?.output_tokens ?? 0;
  } else {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not set');
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          ...(req.system ? [{ role: 'system', content: req.system }] : []),
          { role: 'user', content: req.user },
        ],
        max_tokens: maxTokens,
        temperature,
        response_format: req.response_format === 'json' ? { type: 'json_object' } : undefined,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    text = data.choices?.[0]?.message?.content ?? '';
    tokensIn = data.usage?.prompt_tokens ?? 0;
    tokensOut = data.usage?.completion_tokens ?? 0;
  }

  const cost_gbp = priceFor(model, tokensIn, tokensOut);

  if (hooks.persist) {
    try {
      await hooks.persist({ purpose, model, tokens_in: tokensIn, tokens_out: tokensOut, cost_gbp, ref: req.ref });
    } catch {
      // persistence must never break the actual call
    }
  }

  return {
    text,
    json: req.response_format === 'json' ? safeJson(text) : undefined,
    model,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_gbp,
  };
};

export const priceFor = (model: LlmModel, tokensIn: number, tokensOut: number): number => {
  const price = isAnthropic(model)
    ? ANTHROPIC_PRICE[model]
    : OPENAI_PRICE[model as OpenAiModel];
  if (!price) return 0;
  return (tokensIn * price.in + tokensOut * price.out) / 1_000_000;
};
