import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilterChips, type ChipOption } from '@/components/FilterChips';
import { GradientPhoto } from '@/components/GradientPhoto';
import { useAuth, useHiddenTags } from '@/data/auth';
import { discoverByName, discoverPlaces, fetchPlaceDetails, type PlaceDetails, type Suggestion } from '@/data/discover';
import { makeId } from '@/data/seed';
import { useStore } from '@/data/store';
import { TAG_META } from '@/data/types';
import { fontRounded, radius, space, useTheme } from '@/theme';

const CATEGORIES: ChipOption[] = [
  { key: 'all', label: 'All' },
  { key: 'toddler', label: '🧸 Toddler' },
  { key: 'rainy', label: '🌧️ Rainy day' },
  { key: 'free', label: 'Free' },
  { key: 'outdoors', label: '☀️ Outdoors' },
  { key: 'fullday', label: '🕐 Full day' },
  // The same "looks" you can pick when adding your own place.
  { key: 'woods', label: '🌲 Woods' },
  { key: 'beach', label: '🏖️ Beach' },
  { key: 'farm', label: '🐐 Farm' },
  { key: 'castle', label: '🏰 Castle' },
  { key: 'play', label: '🤸 Play' },
  { key: 'museum', label: '🦕 Museum' },
  { key: 'park', label: '🌳 Park' },
];

const RADII: ChipOption[] = [
  { key: '5', label: 'Within 5 mi' },
  { key: '10', label: 'Within 10 mi' },
  { key: '20', label: 'Within 20 mi' },
  { key: '30', label: 'Within 30 mi' },
];

export default function DiscoverScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const { user, cloud } = useAuth();
  const { addPlace, addPhoto, places } = useStore();

  const homeTown = (user?.user_metadata?.home_town as string | undefined) ?? '';
  const hiddenTags = useHiddenTags();
  const visibleCategories = CATEGORIES.filter((o) => !hiddenTags.includes(o.key));
  const [area, setArea] = useState(homeTown);
  const [cats, setCats] = useState<string[]>([]); // empty = All
  const [radiusMi, setRadiusMi] = useState('20');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [service, setService] = useState<string | undefined>();
  const [searchedNear, setSearchedNear] = useState<string | undefined>();
  const [searched, setSearched] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Suggestion | null>(null);
  const [details, setDetails] = useState<Record<string, PlaceDetails | 'loading' | 'none'>>({});

  // When a preview opens, fetch that place's richer info (description, top
  // review, website) once and cache it for the session.
  useEffect(() => {
    const id = preview?.googleId;
    if (!id || details[id]) return;
    setDetails((prev) => ({ ...prev, [id]: 'loading' }));
    fetchPlaceDetails(id).then((d) => setDetails((prev) => ({ ...prev, [id]: d ?? 'none' })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview?.googleId]);

  const search = useCallback(async (town: string, selected: string[], rad: string) => {
    if (!town.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await discoverPlaces(town.trim(), selected, Number(rad));
      setResults(res.places);
      setService(res.service);
      setSearchedNear(res.searchedNear);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, []);

  // Auto-search on open (and when filters/radius change) — always with what's
  // in the search box, never the saved home town behind the user's back.
  useEffect(() => {
    if (cloud && area.trim()) search(area, cats, radiusMi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats.join(','), radiusMi, cloud]);

  // Chips combine: tap to add/remove; "All" clears the lot.
  const toggleCat = (key: string) =>
    setCats((prev) => (key === 'all' ? [] : prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  // "I already know the place" — search by name, anywhere.
  const [nameQuery, setNameQuery] = useState('');
  const searchByName = async () => {
    if (!nameQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await discoverByName(nameQuery.trim());
      setResults(res.places);
      setService(res.service);
      setSearchedNear(res.searchedNear);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const add = async (s: Suggestion) => {
    setAddedIds((prev) => new Set(prev).add(s.googleId));
    const det = details[s.googleId];
    const bestSummary = s.summary ?? (typeof det === 'object' ? det?.summary : undefined);
    const place = await addPlace({
      name: s.name,
      location: s.address || area.trim() || undefined,
      emoji: s.emoji,
      gradient: s.gradient,
      status: 'not_yet',
      tags: s.tags,
      cost: s.cost,
      googleRating: s.rating,
      notes: bestSummary ? [bestSummary] : [],
    });
    // Keep the real photo with the saved place.
    if (s.photoUrl) addPhoto(place.id, { id: makeId('photo'), uri: s.photoUrl });
  };

  const isAdded = (s: Suggestion) => addedIds.has(s.googleId) || places.some((p) => p.name === s.name);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.surface }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.back, { backgroundColor: c.card, borderColor: c.line }]}>
          <Text style={{ fontSize: 20, color: c.ink, marginTop: -2 }}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { color: c.ink }]}>Discover</Text>
        <View style={{ width: 38 }} />
      </View>

      {!cloud ? (
        <Text style={[styles.note, { color: c.inkSoft }]}>
          Discover finds family-friendly places near you. It's part of cloud sync — once that's switched on, this is
          where new ideas will appear.
        </Text>
      ) : (
        <>
          <View style={styles.searchRow}>
            <TextInput
              value={area}
              onChangeText={setArea}
              placeholder="Town or postcode"
              placeholderTextColor={c.inkFaint}
              onSubmitEditing={() => search(area, cats, radiusMi)}
              style={[styles.input, { backgroundColor: c.card, borderColor: c.line, color: c.ink }]}
            />
            <Pressable onPress={() => search(area, cats, radiusMi)} style={[styles.searchBtn, { backgroundColor: c.primary }]}>
              <Text style={{ color: c.onPrimary, fontWeight: '800', fontFamily: fontRounded }}>Find</Text>
            </Pressable>
          </View>

          <FilterChips options={RADII} active={radiusMi} onChange={setRadiusMi} />
          <FilterChips options={visibleCategories} active={cats.length ? cats : 'all'} onChange={toggleCat} />

          <View style={[styles.searchRow, { paddingTop: 2 }]}>
            <TextInput
              value={nameQuery}
              onChangeText={setNameQuery}
              placeholder="Know the name? Search a specific place…"
              placeholderTextColor={c.inkFaint}
              onSubmitEditing={searchByName}
              style={[styles.input, { backgroundColor: c.card, borderColor: c.line, color: c.ink }]}
            />
            <Pressable onPress={searchByName} style={[styles.searchBtn, { backgroundColor: c.sky }]}>
              <Text style={{ color: '#fff', fontWeight: '800', fontFamily: fontRounded }}>Look up</Text>
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.lg, paddingTop: 4, gap: 14 }} showsVerticalScrollIndicator={false}>
            {!loading && searchedNear && results.length > 0 ? (
              <Text style={[styles.nearLine, { color: c.inkSoft }]}>
                {searchedNear.startsWith('results') ? `🔎 ${searchedNear}` : `📍 Near ${searchedNear}`}
              </Text>
            ) : null}
            {loading ? (
              <View style={styles.centre}>
                <ActivityIndicator color={c.primary} />
                <Text style={[styles.muted, { color: c.inkSoft }]}>Finding places near {area}…</Text>
              </View>
            ) : error ? (
              <View style={styles.centre}>
                <Text style={[styles.muted, { color: c.clay, textAlign: 'center' }]}>{error}</Text>
                <Pressable onPress={() => search(area, cats, radiusMi)} style={[styles.retry, { borderColor: c.line }]}>
                  <Text style={{ color: c.primary, fontWeight: '700' }}>Try again</Text>
                </Pressable>
              </View>
            ) : results.length === 0 ? (
              <View style={styles.centre}>
                <Text style={[styles.muted, { color: c.inkSoft, textAlign: 'center' }]}>
                  {searched
                    ? 'No ideas within that radius — try widening it or a different filter.'
                    : 'Type a town or postcode above to find ideas.'}
                </Text>
              </View>
            ) : (
              results.map((s) => {
                const added = isAdded(s);
                return (
                  <Pressable
                    key={s.googleId}
                    onPress={() => setPreview(s)}
                    style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}
                  >
                    {s.photoUrl ? (
                      <Image source={{ uri: s.photoUrl }} style={{ height: 140, width: '100%' }} resizeMode="cover" />
                    ) : (
                      <GradientPhoto gradient={s.gradient} emoji={s.emoji} fontSize={40} height={104} />
                    )}
                    <View style={{ padding: 14 }}>
                      <Text style={[styles.name, { color: c.ink }]}>{s.name}</Text>
                      {s.address ? (
                        <Text style={[styles.addr, { color: c.inkSoft }]} numberOfLines={1}>
                          📍 {s.address}
                        </Text>
                      ) : null}
                      <View style={styles.meta}>
                        {s.rating ? <Text style={[styles.metaItem, { color: c.star }]}>★ {s.rating.toFixed(1)}</Text> : null}
                        {s.cost ? <Text style={[styles.metaItem, { color: c.inkSoft }]}>💷 {s.cost}</Text> : null}
                        {s.tags.slice(0, 2).map((t) => (
                          <Text key={t} style={[styles.metaItem, { color: c.inkSoft }]}>
                            {TAG_META[t]?.label ?? t}
                          </Text>
                        ))}
                      </View>
                      <View style={[styles.previewHint, { backgroundColor: added ? c.primaryTint : c.card2 }]}>
                        <Text style={{ color: added ? c.primary : c.inkSoft, fontWeight: '700', fontSize: 13 }}>
                          {added ? '✓ On your list' : 'Tap for details'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}

            {searched && !loading ? (
              <Text style={[styles.service, { color: service ? c.inkFaint : c.amber }]}>
                {service
                  ? `Search service ${service}`
                  : '⚠️ The search service looks out of date — paste & redeploy the discover function in Supabase.'}
              </Text>
            ) : null}
          </ScrollView>
        </>
      )}

      {/* ---- Preview overlay: look before you add ---- */}
      {preview ? (
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPreview(null)} />
          <View style={[styles.sheet, { backgroundColor: c.card, borderColor: c.line }]}>
            {preview.photoUrl ? (
              <Image source={{ uri: preview.photoUrl }} style={styles.sheetPhoto} resizeMode="cover" />
            ) : (
              <GradientPhoto gradient={preview.gradient} emoji={preview.emoji} fontSize={54} style={styles.sheetPhoto} />
            )}
            <View style={{ padding: 18 }}>
              <Text style={[styles.sheetName, { color: c.ink }]}>{preview.name}</Text>
              {preview.address ? <Text style={[styles.addr, { color: c.inkSoft }]}>📍 {preview.address}</Text> : null}

              <View style={[styles.meta, { marginTop: 10 }]}>
                {preview.rating ? <Text style={[styles.metaItem, { color: c.star }]}>★ {preview.rating.toFixed(1)} on Google</Text> : null}
                {preview.cost ? <Text style={[styles.metaItem, { color: c.inkSoft }]}>💷 {preview.cost}</Text> : null}
              </View>

              <View style={styles.tagWrap}>
                {preview.tags.map((t) => (
                  <View key={t} style={[styles.tagChip, { backgroundColor: c.card2 }]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: c.inkSoft }}>
                      {TAG_META[t]?.emoji} {TAG_META[t]?.label ?? t}
                    </Text>
                  </View>
                ))}
              </View>

              {(() => {
                const det = details[preview.googleId];
                const loadingDet = det === 'loading';
                const rich = typeof det === 'object' && det !== null ? det : undefined;
                const summary = preview.summary ?? rich?.summary;
                return (
                  <>
                    <Text style={[styles.summary, { color: c.inkSoft }]}>
                      {summary ??
                        (loadingDet ? 'Fetching details…' : 'No description on Google — a mystery worth exploring? 🕵️')}
                    </Text>
                    {rich?.review ? (
                      <View style={[styles.review, { backgroundColor: c.card2 }]}>
                        <Text style={[styles.reviewText, { color: c.ink }]} numberOfLines={5}>
                          “{rich.review.text}”
                        </Text>
                        <Text style={[styles.reviewBy, { color: c.inkFaint }]}>
                          — {rich.review.author}
                          {rich.review.rating ? ` · ★ ${rich.review.rating}` : ''} (Google review)
                        </Text>
                      </View>
                    ) : null}
                    {rich?.website ? (
                      <Pressable onPress={() => Linking.openURL(rich.website!)} style={styles.website}>
                        <Text style={{ color: c.sky, fontWeight: '700', fontSize: 13.5 }}>🔗 Visit website</Text>
                      </Pressable>
                    ) : null}
                  </>
                );
              })()}

              <Pressable
                onPress={() => {
                  if (!isAdded(preview)) add(preview);
                  setPreview(null);
                }}
                style={[styles.sheetCta, { backgroundColor: isAdded(preview) ? c.primaryTint : c.primary }]}
              >
                <Text style={{ color: isAdded(preview) ? c.primary : c.onPrimary, fontWeight: '800', fontFamily: fontRounded, fontSize: 15 }}>
                  {isAdded(preview) ? '✓ Already on your list' : '＋ Add to my list'}
                </Text>
              </Pressable>
              <Pressable onPress={() => setPreview(null)} style={styles.sheetClose}>
                <Text style={{ color: c.inkSoft, fontWeight: '700' }}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingVertical: space.md },
  back: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', fontFamily: fontRounded },
  note: { fontSize: 14, lineHeight: 20, textAlign: 'center', padding: space.xl },
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: space.lg, paddingBottom: space.sm },
  input: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 13, fontSize: 15 },
  searchBtn: { paddingHorizontal: 22, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  centre: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 14 },
  muted: { fontSize: 14 },
  retry: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  card: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  name: { fontSize: 16.5, fontWeight: '800', fontFamily: fontRounded },
  addr: { fontSize: 12.5, marginTop: 5 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 9 },
  metaItem: { fontSize: 12.5, fontWeight: '600' },
  previewHint: { marginTop: 12, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  service: { textAlign: 'center', fontSize: 11.5, marginTop: 6, lineHeight: 16 },
  nearLine: { fontSize: 12.5, fontWeight: '600' },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,31,27,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 420, borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  sheetPhoto: { height: 170, width: '100%', alignItems: 'center', justifyContent: 'center' },
  sheetName: { fontSize: 20, fontWeight: '800', fontFamily: fontRounded },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  tagChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  summary: { fontSize: 13.5, lineHeight: 19, marginTop: 12 },
  review: { borderRadius: 12, padding: 12, marginTop: 12 },
  reviewText: { fontSize: 13, lineHeight: 18.5, fontStyle: 'italic' },
  reviewBy: { fontSize: 11.5, marginTop: 6 },
  website: { marginTop: 12, alignSelf: 'flex-start' },
  sheetCta: { marginTop: 16, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  sheetClose: { alignItems: 'center', paddingVertical: 12 },
});
