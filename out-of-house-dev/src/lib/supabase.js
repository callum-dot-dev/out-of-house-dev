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
      // We use HashRouter so the URL always contains a `#`. Letting Supabase
      // try to detect auth tokens in that hash on every mount can hang the
      // client init. AuthCallback.js handles the magic-link flow explicitly
      // via getSession() after the redirect lands.
      detectSessionInUrl: false,
    },
  },
);

export const isSupabaseConfigured = Boolean(url && anonKey);
