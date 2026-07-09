import type { GradientKey } from '@/theme';
import { supabase } from './supabase';
import type { Tag } from './types';

/** A place suggestion returned by the Discover backend function. */
export type Suggestion = {
  googleId: string;
  name: string;
  address?: string;
  rating?: number;
  cost?: string;
  summary?: string;
  tags: Tag[];
  gradient: GradientKey;
  emoji: string;
  /** A real photo of the place (resolved server-side; no API key involved). */
  photoUrl?: string;
};

export type DiscoverResult = {
  places: Suggestion[];
  /** Version of the deployed backend function — lets the app flag stale deploys. */
  service?: string;
};

/** Ask the secure backend for family-friendly places near a town. */
export async function discoverPlaces(town: string, category?: string, radiusMiles?: number): Promise<DiscoverResult> {
  if (!supabase) throw new Error('Discover needs cloud sync switched on.');
  const { data, error } = await supabase.functions.invoke('discover', { body: { town, category, radiusMiles } });
  if (error) {
    // Pull the real message out of a non-2xx response when we can.
    let msg = 'Could not reach Discover.';
    try {
      // deno-lint-ignore no-explicit-any
      const body = await (error as any).context?.json?.();
      if (body?.error) msg = body.error;
    } catch {
      /* keep fallback */
    }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return { places: (data?.places ?? []) as Suggestion[], service: data?.fnVersion as string | undefined };
}
