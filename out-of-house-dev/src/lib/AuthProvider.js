import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

const SESSION_LOAD_TIMEOUT_MS = 4000;

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) return null;
    const PROFILE_TIMEOUT_MS = 5000;
    try {
      const query = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      const timed = new Promise((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'profile query timed out' } }), PROFILE_TIMEOUT_MS),
      );
      const { data, error } = await Promise.race([query, timed]);
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[auth] profile load failed for', userId, '·', error.message ?? error.code ?? error);
        return null;
      }
      if (!data) {
        // eslint-disable-next-line no-console
        console.warn('[auth] no profile row found for user', userId, '— check the profiles table.');
        return null;
      }
      return data;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[auth] profile load threw for', userId, '·', e?.message ?? e);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeout;

    // Safety: if Supabase getSession hangs (stale token, network blip),
    // unstick the UI after a few seconds so the user can actually log in /
    // out instead of staring at a loader forever.
    timeout = setTimeout(() => {
      if (mounted && loading) {
        // eslint-disable-next-line no-console
        console.warn('[auth] session load timed out, forcing loading=false');
        setLoading(false);
      }
    }, SESSION_LOAD_TIMEOUT_MS);

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session ?? null);
        if (data.session?.user) {
          const p = await loadProfile(data.session.user.id);
          if (mounted) setProfile(p);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[auth] getSession threw', e?.message ?? e);
      } finally {
        if (mounted) setLoading(false);
        clearTimeout(timeout);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession ?? null);
      if (newSession?.user) {
        const p = await loadProfile(newSession.user.id);
        if (mounted) setProfile(p);
      } else {
        if (mounted) setProfile(null);
      }
      // Always settle loading on any auth event.
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadProfile]);

  // Clear local state immediately so the UI updates even if the network call
  // hangs. Best-effort call to Supabase + storage clear for any stale token.
  const signOut = useCallback(async () => {
    setSession(null);
    setProfile(null);
    setLoading(false);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[auth] signOut threw, clearing local storage manually', e?.message ?? e);
    }
    // Belt-and-braces: wipe any lingering Supabase auth keys from localStorage.
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
        .forEach((k) => window.localStorage.removeItem(k));
    } catch { /* private mode */ }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      const p = await loadProfile(session.user.id);
      setProfile(p);
    }
  }, [session, loadProfile]);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    isAuthenticated: !!session,
    isAdmin: profile?.role === 'admin',
    isDeveloper: profile?.role === 'developer' || profile?.role === 'admin',
    isClient: profile?.role === 'client',
    loading,
    signOut,
    refreshProfile,
  }), [session, profile, loading, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
