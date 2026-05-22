// Service-role Supabase client for edge functions.
// Never expose this to the browser.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const url     = Deno.env.get('SUPABASE_URL')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});
