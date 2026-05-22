// Shared CORS helper for every edge function in this repo.
// We allow-list the production + local origins; anything else gets the no-op.

const ALLOWED = [
  'https://out-of-house.dev',
  'https://www.out-of-house.dev',
  'http://localhost:3000',
];

export const corsHeaders = (origin: string | null) => {
  const allow = origin && ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
};

export const handleOptions = (req: Request) => {
  if (req.method !== 'OPTIONS') return null;
  return new Response('ok', { headers: corsHeaders(req.headers.get('origin')) });
};

export const json = (req: Request, body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders(req.headers.get('origin')),
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
