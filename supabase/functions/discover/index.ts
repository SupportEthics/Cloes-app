// Trove — "Discover" backend function (Supabase Edge Function)
// -----------------------------------------------------------
// Securely calls the Google Places API so the API key never reaches the app.
// The app sends a town/postcode + optional category + radius; this returns a
// tidy list of family-friendly suggestions (with real photos) mapped to
// Trove's categories, strictly limited to the chosen distance.
//
// Deploy: Supabase dashboard → Edge Functions → "discover" → Code tab → paste
// this → Deploy. Secret GOOGLE_PLACES_KEY must be set. Verify JWT: OFF.

/** Bumped on every change; returned to the app so deploys are verifiable. */
const FN_VERSION = 'd4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify({ ...body, fnVersion: FN_VERSION }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
const NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';

// Extra words we add to the search to bias results by category.
const CATEGORY_QUERY: Record<string, string> = {
  rainy: 'indoor',
  toddler: 'toddler',
  free: 'free',
  outdoors: 'outdoor',
  fullday: 'full day',
  other: '',
};

// Type-based nearby lookup: this is what finds the LOCAL places (playgrounds,
// parks, farms, pools…) that the text search's famous-places bias misses.
const NEARBY_TYPES: Record<string, string[]> = {
  all: ['park', 'playground', 'zoo', 'farm', 'museum', 'amusement_park', 'amusement_center', 'aquarium', 'water_park', 'national_park', 'hiking_area', 'tourist_attraction', 'historical_landmark', 'library', 'swimming_pool', 'bowling_alley'],
  rainy: ['museum', 'library', 'aquarium', 'amusement_center', 'bowling_alley', 'movie_theater', 'swimming_pool', 'art_gallery'],
  toddler: ['playground', 'zoo', 'farm', 'aquarium', 'park', 'amusement_center'],
  free: ['park', 'playground', 'national_park', 'hiking_area', 'library'],
  outdoors: ['park', 'playground', 'national_park', 'hiking_area', 'farm', 'zoo'],
  fullday: ['zoo', 'amusement_park', 'water_park', 'national_park', 'museum', 'tourist_attraction'],
  other: ['tourist_attraction', 'historical_landmark', 'community_center'],
};

/** "cf453bd" → "CF45 3BD"; anything that isn't a UK postcode passes through. */
function normalizeUkPostcode(s: string): string {
  const t = s.trim().toUpperCase().replace(/\s+/g, '');
  if (/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(t)) return `${t.slice(0, -3)} ${t.slice(-3)}`;
  return s.trim();
}

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

// Find the search area's centre point (one lightweight Places lookup).
async function geocodeTown(town: string, key: string): Promise<{ lat: number; lng: number } | null> {
  const resp = await fetch(PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.location',
    },
    body: JSON.stringify({ textQuery: town, maxResultCount: 1, languageCode: 'en', regionCode: 'GB' }),
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

    const cleanTown = normalizeUkPostcode(String(town));
    const radius = Math.min(Math.max(Number(radiusMiles) || 20, 1), 60);

    // The centre point is required — never silently skip the radius.
    const centre = await geocodeTown(cleanTown, key);
    if (!centre) {
      return json({ error: `Couldn't find "${cleanTown}" — try a town name or a full postcode.` }, 400);
    }

    const hint = category && CATEGORY_QUERY[category] ? ` ${CATEGORY_QUERY[category]}` : '';
    const textQuery = `family friendly days out${hint} near ${cleanTown}`;
    const FIELD_MASK =
      'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.priceLevel,places.editorialSummary,places.photos';
    const circle = {
      center: { latitude: centre.lat, longitude: centre.lng },
      radius: Math.min(radius * 1609.34, 50000), // Google caps circles at 50km
    };
    const headers = { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELD_MASK };

    // Two complementary searches, run together:
    //  1) text search — Google's editorial "best days out" picks (biased local)
    //  2) nearby-by-type — every park/playground/farm/museum/pool INSIDE the
    //     circle, which is what keeps small-radius searches well stocked.
    const nearbyTypes = NEARBY_TYPES[category ?? 'all'] ?? NEARBY_TYPES.all;
    const [textResp, nearbyResp] = await Promise.all([
      fetch(PLACES_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ textQuery, maxResultCount: 20, languageCode: 'en', regionCode: 'GB', locationBias: { circle } }),
      }),
      fetch(NEARBY_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          includedTypes: nearbyTypes,
          maxResultCount: 20,
          rankPreference: 'POPULARITY',
          languageCode: 'en',
          regionCode: 'GB',
          locationRestriction: { circle },
        }),
      }),
    ]);

    const textData = await textResp.json();
    const nearbyData = await nearbyResp.json();
    if (!textResp.ok && !nearbyResp.ok) {
      return json({ error: textData.error?.message ?? nearbyData.error?.message ?? 'The search could not be completed.' }, 502);
    }

    // Merge (nearby first so genuinely-local places lead), dedupe by id, then
    // strictly enforce the radius ourselves (bias alone isn't a guarantee).
    // deno-lint-ignore no-explicit-any
    const seen = new Set<string>();
    // deno-lint-ignore no-explicit-any
    const raw: any[] = [...(nearbyData.places ?? []), ...(textData.places ?? [])].filter((p: any) => {
      if (!p.id || seen.has(p.id)) return false;
      seen.add(p.id);
      const loc = p.location;
      if (!loc) return false;
      return milesBetween(centre, { lat: loc.latitude, lng: loc.longitude }) <= radius;
    });

    // Best-rated first, keep a manageable list.
    raw.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    const mapped = raw.slice(0, 24).map((p) => mapPlace(p));

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
