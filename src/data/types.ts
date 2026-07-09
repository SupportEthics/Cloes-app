import type { GradientKey, Palette } from '@/theme';

export type Status = 'not_yet' | 'would_again' | 'might_again' | 'wouldnt_again';

export type Tag = 'toddler' | 'rainy' | 'free' | 'outdoors' | 'fullday' | 'other';

/** Verdicts in the order they're shown, for pickers and filters. */
export const STATUS_ORDER: Status[] = ['not_yet', 'would_again', 'might_again', 'wouldnt_again'];

export interface Visit {
  id: string;
  date: string; // ISO date string
  rating?: number; // 1–5
  cost?: string;
  companions?: string[];
  note?: string;
}

export interface Photo {
  id: string;
  /** A real image URI (from the photo picker) … */
  uri?: string;
  /** … or an emoji stand-in for seeded/demo memories. */
  emoji?: string;
  /** Who added it — shown as a little credit under the memory. */
  addedBy?: string;
}

export interface Place {
  id: string;
  name: string;
  location?: string;
  emoji: string;
  gradient: GradientKey;
  status: Status;
  tags: Tag[];
  cost?: string;
  /** Google's public rating, captured when added via Discover. */
  googleRating?: number;
  /** The family's own star rating, set on the place page. */
  familyRating?: number;
  notes: string[]; // notes for next time
  visits: Visit[];
  photos: Photo[];
  createdAt: string; // ISO
}

/** The fields needed to create a new place; the rest are filled in by the store. */
export type NewPlace = {
  name: string;
  location?: string;
  emoji: string;
  gradient: Place['gradient'];
  status: Status;
  tags: Tag[];
  cost?: string;
  googleRating?: number;
  familyRating?: number;
  notes?: string[];
};

export const STATUS_META: Record<
  Status,
  { label: string; short: string; bg: keyof Palette; fg: keyof Palette }
> = {
  not_yet: { label: 'To-do', short: '◦ To-do', bg: 'amberTint', fg: 'amber' },
  would_again: { label: 'Would do again', short: '⭐ Would do again', bg: 'primaryTint', fg: 'primary' },
  might_again: { label: 'Might do again', short: '🤔 Might do again', bg: 'skyTint', fg: 'sky' },
  wouldnt_again: { label: "Wouldn't do again", short: "✗ Wouldn't do again", bg: 'clayTint', fg: 'clay' },
};

/** Safe lookup that tolerates any legacy status value from older data. */
export function statusMeta(status: Status) {
  return STATUS_META[status] ?? STATUS_META.not_yet;
}

export const TAG_META: Record<Tag, { label: string; emoji: string }> = {
  toddler: { label: 'Toddler-friendly', emoji: '🧸' },
  rainy: { label: 'Good in rain', emoji: '🌧️' },
  free: { label: 'Free', emoji: '💷' },
  outdoors: { label: 'Outdoors', emoji: '☀️' },
  fullday: { label: 'Full day', emoji: '🕐' },
  other: { label: 'Other', emoji: '🏷️' },
};

/** Average rating across logged visits, or undefined if never rated. */
export function averageRating(place: Place): number | undefined {
  const rated = place.visits.map((v) => v.rating).filter((r): r is number => typeof r === 'number');
  if (!rated.length) return undefined;
  return rated.reduce((a, b) => a + b, 0) / rated.length;
}

/** The rating shown on cards: the family's own stars first, else visit average. */
export function displayRating(place: Place): number | undefined {
  return place.familyRating ?? averageRating(place);
}

/** Most recent visit date, or undefined for bucket-list-only places. */
export function lastVisit(place: Place): Date | undefined {
  if (!place.visits.length) return undefined;
  const times = place.visits.map((v) => new Date(v.date).getTime());
  return new Date(Math.max(...times));
}
