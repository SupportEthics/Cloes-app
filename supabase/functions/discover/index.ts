// Trove — "Discover" backend function (Supabase Edge Function)
// -----------------------------------------------------------
// Securely calls the Google Places API so the API key never reaches the app.
// The app sends a town + optional category + radius; this returns a tidy list
// of family-friendly suggestions mapped to Trove's own categories, limited to
// the chosen distance from the town.
//
// Deploy: Supabase dashboard → Edge Functions → "discover" → Code tab → paste
// this → Deploy. Secret GOOGLE_PLACES_KEY must be set. Verify JWT: OFF.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';

// Extra words we add to the search to bias results by category.
const CATEGORY_QUERY: Record<string, string> = {
  rainy: 'indoor',
  toddler: 'toddler',
  free: 'free',
  outdoors: 'outdoor',
  fullday: 'full day',
  other: '',
};

// Map Google place "types" to a Trove look (gradient + emoji) and tags.
function classify(types: string[]): { gradient: string; emoji: string; tags: string[] } {
  const t = new Set(types ?? []);
  if (t.has('amusement_park')) return { gradient: 'farm', emoji: '🎢', tags: ['fullday'] };
  if (t.has('zoo') || t.has('aquarium')) return { gradient: 'farm', emoji: '🦁', tags: ['fullday', 'toddler'] };
  if (t.has('farm')) return { gradient: 'farm', emoji: '🐐', tags: ['fullday', 'toddler'] };
  if (t.has('national_park') || t.has('park') || t.has('hiking_area')) return { gradient: 'park', emoji: '🌳', tags: ['outdoors', 'free'] };
  if (t.has('playground')) return { gradient: 'soft', emoji: '🛝', tags: ['toddler', 'outdoors'] };
  if (t.has('museum')) return { gradient: 'museum', emoji: '🏛️', tags: ['rainy'] };
  if (t.has('art_gallery')) return { gradient: 'museum', emoji: '🎨', tags: ['rainy'] };
  if (t.has('beach')) return { gradient: 'beach', emoji: '🏖️', tags: ['outdoors', 'free'] };
  if (t.has('castle') || t.has('historical_landmark') || t.has('tourist_attraction')) return { gradient: 'castle', emoji: '🏰', tags: ['fullday'] };
  if (t.has('library') || t.has('community_center')) return { gradient: 'museum', emoji: '📚', tags: ['rainy', 'free'] };
  return { gradient: 'woods', emoji: '📍', tags: ['other'] };
}

function priceToCost(level?: string): string | undefined {
  switch (level) {
    case 'PRICE_LEVEL_FREE': return 'Free';
    case 'PRICE_LEVEL_INEXPENSIVE': return '£';
    case 'PRICE_LEVEL_MODERATE': return '££';
    case 'PRICE_LEVEL_EXPENSIVE': return '£££';
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return '££££';
    default: return undefined;
  }
}

// deno-lint-ignore no-explicit-any
function mapPlace(p: any) {
  const look = classify(p.types ?? []);
  const cost = priceToCost(p.priceLevel);
  const tags = new Set<string>(look.tags);
  if (cost === 'Free') tags.add('free');
  return {
    googleId: p.id as string,
    name: p.displayName?.text ?? 'Unnamed place',
    address: p.formattedAddress ?? undefined,
    rating: typeof p.rating === 'number' ? p.rating : undefined,
    cost,
    summary: p.editorialSummary?.text ?? undefined,
    tags: Array.from(tags),
    gradient: look.gradient,
    emoji: look.emoji,
    photoName: p.photos?.[0]?.name as string | undefined,
    photoUrl: undefined as string | undefined,
  };
}

// Resolve a Google photo reference to a plain image URL the app can display
// (skipHttpRedirect returns the googleusercontent link WITHOUT exposing our key).
async function resolvePhoto(name: string, key: string): Promise<string | undefined> {
  try {
    const r = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=800&skipHttpRedirect=true`, {
      headers: { 'X-Goog-Api-Key': key },
    });
    if (!r.ok) return undefined;
    const j = await r.json();
    return typeof j.photoUri === 'string' ? j.photoUri : undefined;
  } catch {
    return undefined;
  }
}

// Great-circle distance in miles between two lat/lng points.
function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Find a town's centre point (via one lightweight Places lookup — no extra API).
async function geocodeTown(town: string, key: string): Promise<{ lat: number; lng: number } | null> {
  const resp = await fetch(PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.location',
    },
    body: JSON.stringify({ textQuery: town, maxResultCount: 1, languageCode: 'en' }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const loc = data.places?.[0]?.location;
  return loc ? { lat: loc.latitude, lng: loc.longitude } : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { town, category, radiusMiles } = await req.json().catch(() => ({}));
    if (!town || !String(town).trim()) return json({ error: 'Set your home town first, then try again.' }, 400);

    const key = Deno.env.get('GOOGLE_PLACES_KEY');
    if (!key) return json({ error: 'The places service is not configured yet.' }, 500);

    const cleanTown = String(town).trim();
    const hint = category && CATEGORY_QUERY[category] ? ` ${CATEGORY_QUERY[category]}` : '';
    const textQuery = `family friendly days out${hint} near ${cleanTown}`;

    const resp = await fetch(PLACES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.priceLevel,places.editorialSummary,places.photos',
      },
      body: JSON.stringify({ textQuery, maxResultCount: 20, languageCode: 'en' }),
    });

    const data = await resp.json();
    if (!resp.ok) return json({ error: data.error?.message ?? 'The search could not be completed.' }, 502);

    // deno-lint-ignore no-explicit-any
    let raw: any[] = data.places ?? [];

    // Limit to the chosen radius from the town centre.
    const radius = Number(radiusMiles);
    if (radius && radius > 0) {
      const centre = await geocodeTown(cleanTown, key);
      if (centre) {
        raw = raw.filter((p) => {
          const loc = p.location;
          if (!loc) return false;
          return milesBetween(centre, { lat: loc.latitude, lng: loc.longitude }) <= radius;
        });
      }
    }

    const mapped = raw.map((p) => mapPlace(p));

    // Fetch a real photo for each result (in parallel; failures just fall back
    // to the app's gradient tiles).
    await Promise.all(
      mapped.map(async (m) => {
        if (m.photoName) m.photoUrl = await resolvePhoto(m.photoName, key);
        delete (m as { photoName?: string }).photoName;
      }),
    );

    return json({ places: mapped });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Something went wrong.' }, 500);
  }
});
