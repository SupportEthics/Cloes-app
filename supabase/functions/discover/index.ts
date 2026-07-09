// Trove — "Discover" backend function (Supabase Edge Function)
// -----------------------------------------------------------
// Securely calls the Google Places API so the API key never reaches the app.
// The app sends a town + optional category; this returns a tidy list of
// family-friendly suggestions mapped to Trove's own categories.
//
// Deploy: Supabase dashboard → Edge Functions → create "discover" → paste this
// → set secret GOOGLE_PLACES_KEY → deploy with "Verify JWT" OFF (so the
// browser's preflight succeeds; abuse is bounded by your Google budget cap).

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

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
  if (t.has('amusement_park') || t.has('zoo') || t.has('aquarium')) return { gradient: 'farm', emoji: '🎢', tags: ['fullday'] };
  if (t.has('farm') || t.has('petting_zoo')) return { gradient: 'farm', emoji: '🐐', tags: ['fullday', 'toddler'] };
  if (t.has('national_park') || t.has('park') || t.has('hiking_area')) return { gradient: 'park', emoji: '🌳', tags: ['outdoors', 'free'] };
  if (t.has('playground')) return { gradient: 'soft', emoji: '🛝', tags: ['toddler', 'outdoors'] };
  if (t.has('museum') || t.has('art_gallery')) return { gradient: 'museum', emoji: '🏛️', tags: ['rainy'] };
  if (t.has('aquarium')) return { gradient: 'beach', emoji: '🐠', tags: ['rainy', 'fullday'] };
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
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { town, category } = await req.json().catch(() => ({}));
    if (!town || !String(town).trim()) return json({ error: 'Set your home town first, then try again.' }, 400);

    const key = Deno.env.get('GOOGLE_PLACES_KEY');
    if (!key) return json({ error: 'The places service is not configured yet.' }, 500);

    const hint = category && CATEGORY_QUERY[category] ? ` ${CATEGORY_QUERY[category]}` : '';
    const textQuery = `family friendly days out${hint} in ${String(town).trim()}`;

    const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.priceLevel,places.editorialSummary',
      },
      body: JSON.stringify({ textQuery, maxResultCount: 15, languageCode: 'en' }),
    });

    const data = await resp.json();
    if (!resp.ok) return json({ error: data.error?.message ?? 'The search could not be completed.' }, 502);

    // deno-lint-ignore no-explicit-any
    const places = (data.places ?? []).map((p: any) => mapPlace(p));
    return json({ places });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Something went wrong.' }, 500);
  }
});
