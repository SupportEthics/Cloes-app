import { lastVisit, type Place } from './types';

/**
 * The "why keep it installed" layer. These are the gentle reminders that turn a
 * static list into a companion: revisit prompts, time-since nudges, and
 * weather-aware suggestions powered by real conditions at the family's home
 * town (Open-Meteo — free, no API key).
 */

export type Weather = {
  sunny: boolean;
  raining: boolean;
  tempC: number;
  summary: string;
  emoji: string;
};

/** WMO weather code → friendly words + emoji. */
function describe(code: number): { words: string; emoji: string; sunny: boolean; raining: boolean } {
  if (code === 0) return { words: 'clear skies', emoji: '☀️', sunny: true, raining: false };
  if (code <= 2) return { words: 'sunny spells', emoji: '🌤️', sunny: true, raining: false };
  if (code === 3) return { words: 'cloudy', emoji: '☁️', sunny: false, raining: false };
  if (code <= 48) return { words: 'foggy', emoji: '🌫️', sunny: false, raining: false };
  if (code <= 67) return { words: 'rainy', emoji: '🌧️', sunny: false, raining: true };
  if (code <= 77) return { words: 'snowy', emoji: '❄️', sunny: false, raining: false };
  if (code <= 82) return { words: 'showery', emoji: '🌦️', sunny: false, raining: true };
  return { words: 'stormy', emoji: '⛈️', sunny: false, raining: true };
}

/** Real weather for a town via Open-Meteo; null when it can't be resolved. */
export async function fetchWeather(town: string): Promise<Weather | null> {
  try {
    const g = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(town)}&count=1&language=en&format=json`,
    ).then((r) => r.json());
    const loc = g.results?.[0];
    if (!loc) return null;
    const w = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code&timezone=auto`,
    ).then((r) => r.json());
    const tempC = Math.round(w.current?.temperature_2m);
    const code = Number(w.current?.weather_code ?? 3);
    if (!Number.isFinite(tempC)) return null;
    const d = describe(code);
    return { sunny: d.sunny, raining: d.raining, tempC, summary: `${tempC}° & ${d.words}`, emoji: d.emoji };
  } catch {
    return null;
  }
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
  kind: 'sunny' | 'longtime' | 'todo' | 'rainy';
  icon: string;
  title: string;
  subtitle: string;
  placeId?: string;
};

export function buildNudges(places: Place[], weather?: Weather | null): Nudge[] {
  const nudges: Nudge[] = [];

  // 1. Sunny-day revisit — a loved outdoor place (only when it's ACTUALLY sunny).
  if (weather?.sunny) {
    const outdoorFave = places.find((p) => p.status === 'would_again' && p.tags.includes('outdoors'));
    if (outdoorFave) {
      nudges.push({
        id: 'sunny',
        kind: 'sunny',
        icon: '☀️',
        title: 'Sunny today — revisit an outdoor favourite',
        subtitle: outdoorFave.location ? `${outdoorFave.name} · ${outdoorFave.location}` : outdoorFave.name,
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

  // 3. Still on the to-do list.
  const todo = places.filter((p) => p.status === 'not_yet');
  if (todo.length) {
    nudges.push({
      id: 'todo',
      kind: 'todo',
      icon: '📌',
      title: `${todo.length} ${todo.length > 1 ? 'places' : 'place'} still to explore`,
      subtitle: 'On your to-do list, waiting for the right day',
    });
  }

  // 4. Rainy-day options saved — urgent phrasing when it's actually raining.
  const rainy = places.filter((p) => p.tags.includes('rainy') && p.status !== 'wouldnt_again');
  if (rainy.length) {
    nudges.push({
      id: 'rainy',
      kind: 'rainy',
      icon: '🌧️',
      title: weather?.raining ? 'Wet one today — indoor ideas ready' : 'Saved for a rainy day',
      subtitle: `${rainy.length} indoor idea${rainy.length > 1 ? 's' : ''}${weather?.raining ? ' on your list' : ' for when the weather turns'}`,
    });
  }

  return nudges;
}
