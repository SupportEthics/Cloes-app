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
};

/** Ask the secure backend for family-friendly places near a town. */
export async function discoverPlaces(town: string, category?: string): Promise<Suggestion[]> {
  if (!supabase) throw new Error('Discover needs cloud sync switched on.');
  const { data, error } = await supabase.functions.invoke('discover', { body: { town, category } });
  if (error) throw new Error(error.message ?? 'Could not reach Discover.');
  if (data?.error) throw new Error(data.error);
  return (data?.places ?? []) as Suggestion[];
}
