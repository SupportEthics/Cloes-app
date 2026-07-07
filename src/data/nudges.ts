import { lastVisit, type Place } from './types';

/**
 * The "why keep it installed" layer. These are the gentle reminders that turn a
 * static list into a companion: revisit prompts, time-since nudges, and
 * bucket-list nudges. Weather is stubbed here — Phase 3 swaps `todayWeather`
 * for a real forecast call (e.g. Open-Meteo) keyed on the family's location.
 */

export type Weather = { sunny: boolean; tempC: number; summary: string };

/** Deterministic stub so the demo is stable; replace with a forecast API. */
export function todayWeather(): Weather {
  return { sunny: true, tempC: 21, summary: '21° & sunny — perfect for outdoors' };
}

export function monthsSince(date: Date): number {
  const ms = Date.now() - date.getTime();
  return ms / (1000 * 60 * 60 * 24 * 30.44);
}

export function humanSince(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  const months = Math.round(days / 30.44);
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? 'over a year ago' : `${years} years ago`;
}

export type Nudge = {
  id: string;
  kind: 'sunny' | 'longtime' | 'nearby' | 'rainy';
  icon: string;
  title: string;
  subtitle: string;
  placeId?: string;
};

export function buildNudges(places: Place[]): Nudge[] {
  const nudges: Nudge[] = [];
  const weather = todayWeather();

  // 1. Sunny-day revisit — a loved outdoor place.
  if (weather.sunny) {
    const outdoorFave = places.find((p) => p.status === 'would_again' && p.tags.includes('outdoors'));
    if (outdoorFave) {
      nudges.push({
        id: 'sunny',
        kind: 'sunny',
        icon: '☀️',
        title: 'Sunny today — revisit an outdoor favourite',
        subtitle: `${outdoorFave.name} · ${outdoorFave.travelTime ?? 'nearby'}`,
        placeId: outdoorFave.id,
      });
    }
  }

  // 2. Long time since a visited place.
  const stale = places
    .map((p) => ({ p, last: lastVisit(p) }))
    .filter((x): x is { p: Place; last: Date } => !!x.last && monthsSince(x.last) >= 6)
    .sort((a, b) => a.last.getTime() - b.last.getTime());
  if (stale.length) {
    const { p, last } = stale[0];
    nudges.push({
      id: 'longtime',
      kind: 'longtime',
      icon: '⏳',
      title: `It's been ${humanSince(last).replace(' ago', '')}`,
      subtitle: `since you visited ${p.name}`,
      placeId: p.id,
    });
  }

  // 3. Nearby bucket-list spots.
  const nearbyBucket = places.filter((p) => p.status === 'not_yet' && p.tags.includes('nearby'));
  if (nearbyBucket.length) {
    nudges.push({
      id: 'nearby',
      kind: 'nearby',
      icon: '📍',
      title: `${nearbyBucket.length} bucket-list spot${nearbyBucket.length > 1 ? 's' : ''} nearby`,
      subtitle: 'Still waiting on your list — all a short drive away',
    });
  }

  // 4. Rainy-day options saved.
  const rainy = places.filter((p) => p.tags.includes('rainy') && p.status !== 'wouldnt_again');
  if (rainy.length) {
    nudges.push({
      id: 'rainy',
      kind: 'rainy',
      icon: '🌧️',
      title: 'Saved for a rainy day',
      subtitle: `${rainy.length} indoor idea${rainy.length > 1 ? 's' : ''} for when the weather turns`,
    });
  }

  return nudges;
}
