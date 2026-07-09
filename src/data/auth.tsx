import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { isCloudConfigured, supabase } from './supabase';

type AuthValue = {
  /** null in local mode, or when signed out in cloud mode. */
  session: Session | null;
  user: User | null;
  loading: boolean;
  cloud: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  updateProfile: (fields: { name?: string; homeTown?: string; hiddenTags?: string[] }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isCloudConfigured);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));

    // Keep the access token fresh while the app is foregrounded.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase!.auth.startAutoRefresh();
      else supabase!.auth.stopAutoRefresh();
    });
    supabase.auth.startAutoRefresh();

    return () => {
      sub.subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      cloud: isCloudConfigured,
      signIn: async (email, password) => {
        if (!supabase) return {};
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        return error ? { error: error.message } : {};
      },
      signUp: async (email, password, name) => {
        if (!supabase) return {};
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (error) return { error: error.message };
        // If email confirmation is on, there's no session until they confirm.
        return { needsConfirmation: !data.session };
      },
      updateProfile: async ({ name, homeTown, hiddenTags }) => {
        if (!supabase) return {};
        const data: Record<string, unknown> = {};
        if (name !== undefined) data.display_name = name.trim();
        if (homeTown !== undefined) data.home_town = homeTown.trim();
        if (hiddenTags !== undefined) data.hidden_tags = hiddenTags;
        const { error } = await supabase.auth.updateUser({ data });
        return error ? { error: error.message } : {};
      },
      signOut: async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Categories this user has switched off in their profile preferences. */
export function useHiddenTags(): string[] {
  const { user } = useAuth();
  return (user?.user_metadata?.hidden_tags as string[] | undefined) ?? [];
}
