import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { auth } from './api';

const AuthContext = createContext(null);

// Backed by the platform API (httpOnly cookie session) instead of supabase-js.
// Exposes the same surface the pages already use: { user, profile, role,
// isAuthenticated, isAdmin, isDeveloper, isClient, loading, signIn, signOut,
// refreshProfile }.
export const AuthProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { user } = await auth.me();
      setProfile(user);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const signIn = useCallback(async (email, password) => {
    const { user } = await auth.login(email, password);
    setProfile(user);
    setLoading(false);
    return user;
  }, []);

  const signOut = useCallback(async () => {
    setProfile(null);
    setLoading(false);
    try {
      await auth.logout();
    } catch {
      /* best-effort */
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await load();
  }, [load]);

  const value = useMemo(
    () => ({
      user: profile,
      profile,
      session: profile ? { user: profile } : null,
      role: profile?.role ?? null,
      isAuthenticated: !!profile,
      isAdmin: profile?.role === 'admin',
      isDeveloper: profile?.role === 'developer' || profile?.role === 'admin',
      isClient: profile?.role === 'client',
      loading,
      signIn,
      signOut,
      refreshProfile,
      setProfile,
    }),
    [profile, loading, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
