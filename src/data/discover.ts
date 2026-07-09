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
  /** The resolved location Google actually searched around (transparency). */
  searchedNear?: string;
};

/** Richer on-demand info for one place (shown in the preview sheet). */
export type PlaceDetails = {
  summary?: string;
  review?: { text: string; author: string; rating?: number };
  website?: string;
};

/** Fetch one place's description / top review / website via the backend. */
export async function fetchPlaceDetails(googleId: string): Promise<PlaceDetails | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke('discover', { body: { detailsFor: googleId } });
    if (error || data?.error) return null;
    return (data?.details ?? null) as PlaceDetails | null;
  } catch {
    return null;
  }
}

/** Look up a specific place by name (no radius — you already know it exists). */
export async function discoverByName(name: string): Promise<DiscoverResult> {
  if (!supabase) throw new Error('Discover needs cloud sync switched on.');
  const { data, error } = await supabase.functions.invoke('discover', { body: { nameQuery: name } });
  if (error) {
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
  return {
    places: (data?.places ?? []) as Suggestion[],
    service: data?.fnVersion as string | undefined,
    searchedNear: data?.searchedNear as string | undefined,
  };
}

/** Ask the secure backend for family-friendly places near a town. Filters combine. */
export async function discoverPlaces(town: string, categories: string[], radiusMiles?: number): Promise<DiscoverResult> {
  if (!supabase) throw new Error('Discover needs cloud sync switched on.');
  const { data, error } = await supabase.functions.invoke('discover', { body: { town, categories, radiusMiles } });
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
  return {
    places: (data?.places ?? []) as Suggestion[],
    service: data?.fnVersion as string | undefined,
    searchedNear: data?.searchedNear as string | undefined,
  };
}
