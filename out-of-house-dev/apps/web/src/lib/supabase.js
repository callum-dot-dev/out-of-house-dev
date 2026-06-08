import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Don't crash production renders — surface a clear console warning instead.
  // The Apply form and Login page show a banner if these are missing.
  // eslint-disable-next-line no-console
  console.warn('[supabase] REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY is missing. See README.');
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // We use BrowserRouter now, so Supabase's URL-hash session detection
      // can run safely on the callback route. AuthCallback.js still
      // polls getSession() as a belt-and-braces for slow networks.
      detectSessionInUrl: true,
    },
  },
);

export const isSupabaseConfigured = Boolean(url && anonKey);
