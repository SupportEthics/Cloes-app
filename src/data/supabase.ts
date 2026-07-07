import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

/**
 * The shared-cloud client.
 *
 * Trove runs happily with NO backend: if the two env vars below are absent the
 * app stays in on-device "local mode" (see `store.tsx`). The moment you add a
 * Supabase project's URL + anon key (see `.env.example` and the README), the
 * same app gains real logins and a journal shared across the family's phones.
 *
 * The anon key is safe to ship in the app — row-level security (see
 * `supabase/schema.sql`) is what actually protects each family's data.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

/** True when a Supabase project is configured — flips the app into cloud mode. */
export const isCloudConfigured = supabase !== null;
