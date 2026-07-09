import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilterChips, type ChipOption } from '@/components/FilterChips';
import { GradientPhoto } from '@/components/GradientPhoto';
import { useAuth } from '@/data/auth';
import { discoverPlaces, type Suggestion } from '@/data/discover';
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
  const { addPlace, places } = useStore();

  const homeTown = (user?.user_metadata?.home_town as string | undefined) ?? '';
  const [area, setArea] = useState(homeTown);
  const [category, setCategory] = useState('all');
  const [radius, setRadius] = useState('20');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const search = useCallback(
    async (town: string, cat: string, rad: string) => {
      if (!town.trim()) return;
      setLoading(true);
      setError(null);
      try {
        setResults(await discoverPlaces(town.trim(), cat === 'all' ? undefined : cat, Number(rad)));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Auto-search on open (and when category/radius changes) if we know the town.
  useEffect(() => {
    if (cloud && homeTown.trim()) search(homeTown, category, radius);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, radius, cloud]);

  const add = async (s: Suggestion) => {
    setAddedIds((prev) => new Set(prev).add(s.googleId));
    await addPlace({
      name: s.name,
      location: s.address || area.trim() || undefined,
      emoji: s.emoji,
      gradient: s.gradient,
      status: 'not_yet',
      tags: s.tags,
      cost: s.cost,
      notes: s.summary ? [s.summary] : [],
    });
  };

  const alreadyOnList = (s: Suggestion) => places.some((p) => p.name === s.name);

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
              placeholder="Town or area"
              placeholderTextColor={c.inkFaint}
              onSubmitEditing={() => search(area, category, radius)}
              style={[styles.input, { backgroundColor: c.card, borderColor: c.line, color: c.ink }]}
            />
            <Pressable onPress={() => search(area, category, radius)} style={[styles.searchBtn, { backgroundColor: c.primary }]}>
              <Text style={{ color: c.onPrimary, fontWeight: '800', fontFamily: fontRounded }}>Find</Text>
            </Pressable>
          </View>

          <FilterChips options={RADII} active={radius} onChange={setRadius} />
          <FilterChips options={CATEGORIES} active={category} onChange={setCategory} />

          <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 4, gap: 14 }} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.centre}>
                <ActivityIndicator color={c.primary} />
                <Text style={[styles.muted, { color: c.inkSoft }]}>Finding places near {area}…</Text>
              </View>
            ) : error ? (
              <View style={styles.centre}>
                <Text style={[styles.muted, { color: c.clay, textAlign: 'center' }]}>{error}</Text>
                <Pressable onPress={() => search(area, category, radius)} style={[styles.retry, { borderColor: c.line }]}>
                  <Text style={{ color: c.primary, fontWeight: '700' }}>Try again</Text>
                </Pressable>
              </View>
            ) : results.length === 0 ? (
              <View style={styles.centre}>
                <Text style={[styles.muted, { color: c.inkSoft, textAlign: 'center' }]}>
                  {area.trim() ? 'No ideas yet — try a bigger radius or a different filter.' : 'Type a town above to find ideas.'}
                </Text>
              </View>
            ) : (
              results.map((s) => {
                const added = addedIds.has(s.googleId) || alreadyOnList(s);
                return (
                  <View key={s.googleId} style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
                    <GradientPhoto gradient={s.gradient} emoji={s.emoji} fontSize={40} height={104} />
                    <View style={{ padding: 14 }}>
                      <Text style={[styles.name, { color: c.ink }]}>{s.name}</Text>
                      {s.address ? <Text style={[styles.addr, { color: c.inkSoft }]} numberOfLines={1}>📍 {s.address}</Text> : null}
                      <View style={styles.meta}>
                        {s.rating ? <Text style={[styles.metaItem, { color: c.star }]}>★ {s.rating.toFixed(1)}</Text> : null}
                        {s.cost ? <Text style={[styles.metaItem, { color: c.inkSoft }]}>💷 {s.cost}</Text> : null}
                        {s.tags.slice(0, 2).map((t) => (
                          <Text key={t} style={[styles.metaItem, { color: c.inkSoft }]}>{TAG_META[t]?.label ?? t}</Text>
                        ))}
                      </View>
                      <Pressable
                        onPress={() => add(s)}
                        disabled={added}
                        style={[styles.addBtn, { backgroundColor: added ? c.primaryTint : c.primary }]}
                      >
                        <Text style={{ color: added ? c.primary : c.onPrimary, fontWeight: '800', fontFamily: fontRounded }}>
                          {added ? '✓ On your list' : '＋ Add to my list'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </>
      )}
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
  addBtn: { marginTop: 14, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
});
