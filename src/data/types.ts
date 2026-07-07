import type { GradientKey, Palette } from '@/theme';

export type Status = 'not_yet' | 'done' | 'would_again' | 'wouldnt_again';

export type Tag = 'toddler' | 'rainy' | 'free' | 'outdoors' | 'fullday' | 'nearby';

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
  travelTime?: string;
  notes: string[]; // notes for next time
  visits: Visit[];
  photos: Photo[];
  createdAt: string; // ISO
}

export const STATUS_META: Record<
  Status,
  { label: string; short: string; bg: keyof Palette; fg: keyof Palette }
> = {
  not_yet: { label: 'Not yet', short: '◦ Not yet', bg: 'amberTint', fg: 'amber' },
  done: { label: 'Been & done', short: '✓ Done', bg: 'skyTint', fg: 'sky' },
  would_again: { label: 'Would do again', short: '⭐ Would do again', bg: 'primaryTint', fg: 'primary' },
  wouldnt_again: { label: "Wouldn't again", short: "✗ Wouldn't again", bg: 'clayTint', fg: 'clay' },
};

export const TAG_META: Record<Tag, { label: string; emoji: string }> = {
  toddler: { label: 'Toddler-friendly', emoji: '🧸' },
  rainy: { label: 'Good in rain', emoji: '🌧️' },
  free: { label: 'Free', emoji: '💷' },
  outdoors: { label: 'Outdoors', emoji: '☀️' },
  fullday: { label: 'Full day', emoji: '🕐' },
  nearby: { label: 'Nearby', emoji: '📍' },
};

/** Average rating across logged visits, or undefined if never rated. */
export function averageRating(place: Place): number | undefined {
  const rated = place.visits.map((v) => v.rating).filter((r): r is number => typeof r === 'number');
  if (!rated.length) return undefined;
  return rated.reduce((a, b) => a + b, 0) / rated.length;
}

/** Most recent visit date, or undefined for bucket-list-only places. */
export function lastVisit(place: Place): Date | undefined {
  if (!place.visits.length) return undefined;
  const times = place.visits.map((v) => new Date(v.date).getTime());
  return new Date(Math.max(...times));
}
