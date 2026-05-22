// Thin wrapper over Anthropic + OpenAI so each edge function can pick the
// right model per call without each function duplicating the boilerplate.

const ANTHROPIC = 'https://api.anthropic.com/v1/messages';
const OPENAI    = 'https://api.openai.com/v1/chat/completions';

export type LlmRequest = {
  system?: string;
  user: string;
  model?: 'claude-opus-4-7' | 'claude-sonnet-4-6' | 'claude-haiku-4-5-20251001'
        | 'gpt-4o' | 'gpt-4o-mini';
  max_tokens?: number;
  temperature?: number;
  response_format?: 'json' | 'text';
};

export type LlmResponse = {
  text: string;
  json?: unknown;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_gbp: number;
};

const ANTHROPIC_PRICE = {
  // £ per million tokens, rough Jan 2026 list price
  'claude-opus-4-7':         { in: 12.0, out: 60.0 },
  'claude-sonnet-4-6':       { in:  2.4, out: 12.0 },
  'claude-haiku-4-5-20251001':{ in: 0.6, out:  3.0 },
};

const OPENAI_PRICE = {
  'gpt-4o':       { in: 2.0, out: 8.0 },
  'gpt-4o-mini':  { in: 0.12, out: 0.48 },
};

export const llm = async (req: LlmRequest): Promise<LlmResponse> => {
  const model = req.model || 'claude-haiku-4-5-20251001';
  const max_tokens = req.max_tokens ?? 1024;
  const temperature = req.temperature ?? 0.3;

  if (model.startsWith('claude')) {
    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) throw new Error('ANTHROPIC_API_KEY not set');
    const res = await fetch(ANTHROPIC, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens,
        temperature,
        system: req.system,
        messages: [{ role: 'user', content: req.user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const tokens_in  = data.usage?.input_tokens  || 0;
    const tokens_out = data.usage?.output_tokens || 0;
    const price = ANTHROPIC_PRICE[model as keyof typeof ANTHROPIC_PRICE];
    const cost_gbp = price ? (tokens_in * price.in + tokens_out * price.out) / 1_000_000 : 0;
    return {
      text,
      json: req.response_format === 'json' ? safeJson(text) : undefined,
      model, tokens_in, tokens_out, cost_gbp,
    };
  }

  // OpenAI
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch(OPENAI, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        ...(req.system ? [{ role: 'system', content: req.system }] : []),
        { role: 'user', content: req.user },
      ],
      max_tokens,
      temperature,
      response_format: req.response_format === 'json' ? { type: 'json_object' } : undefined,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const tokens_in  = data.usage?.prompt_tokens     || 0;
  const tokens_out = data.usage?.completion_tokens || 0;
  const price = OPENAI_PRICE[model as keyof typeof OPENAI_PRICE];
  const cost_gbp = price ? (tokens_in * price.in + tokens_out * price.out) / 1_000_000 : 0;
  return {
    text,
    json: req.response_format === 'json' ? safeJson(text) : undefined,
    model, tokens_in, tokens_out, cost_gbp,
  };
};

const safeJson = (s: string) => {
  try { return JSON.parse(s); } catch { return null; }
};
