import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FilterChips, type ChipOption } from '@/components/FilterChips';
import { PlaceCard } from '@/components/PlaceCard';
import { Screen } from '@/components/Screen';
import { useHiddenTags } from '@/data/auth';
import { useStore } from '@/data/store';
import type { Place, Status, Tag } from '@/data/types';
import { fontRounded, space, useTheme } from '@/theme';

const STATUS_KEYS: Status[] = ['not_yet', 'would_again', 'might_again', 'wouldnt_again'];

function matches(place: Place, key: string): boolean {
  if (key === 'all') return true;
  if ((STATUS_KEYS as string[]).includes(key)) return place.status === key;
  return place.tags.includes(key as Tag);
}

export default function ListScreen() {
  const { c } = useTheme();
  const { places } = useStore();
  const hiddenTags = useHiddenTags();
  const [filter, setFilter] = useState('all');

  const filters: ChipOption[] = [
    { key: 'all', label: `All ${places.length}` },
    { key: 'not_yet', label: '◦ To-do' },
    { key: 'would_again', label: '⭐ Would do again' },
    { key: 'might_again', label: '🤔 Might do again' },
    { key: 'wouldnt_again', label: "✗ Wouldn't do again" },
    { key: 'rainy', label: '🌧️ Rainy day' },
    { key: 'free', label: 'Free' },
    { key: 'toddler', label: 'Toddler-friendly' },
    { key: 'outdoors', label: 'Outdoors' },
    { key: 'fullday', label: 'Full day' },
    { key: 'other', label: 'Other' },
  ].filter((f) => !hiddenTags.includes(f.key));

  const shown = useMemo(() => places.filter((p) => matches(p, filter)), [places, filter]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: c.inkFaint }]}>THE FAMILY LIST</Text>
        <Text style={[styles.h1, { color: c.ink }]}>Adventures</Text>
      </View>

      <View style={{ marginHorizontal: -space.lg }}>
        <FilterChips options={filters} active={filter} onChange={setFilter} />
      </View>

      <View style={styles.list}>
        {shown.map((p) => (
          <PlaceCard key={p.id} place={p} />
        ))}
      </View>

      {shown.length === 0 ? (
        <Text style={[styles.empty, { color: c.inkSoft }]}>
          Nothing matches that filter yet — tap ＋ to add a place and fill the gap. 🌱
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: space.sm, paddingBottom: space.xs },
  eyebrow: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1 },
  h1: { fontSize: 24, fontWeight: '800', marginTop: 6, fontFamily: fontRounded },
  list: { gap: 14, marginTop: space.sm },
  empty: { textAlign: 'center', paddingVertical: 40, fontSize: 14, lineHeight: 20 },
});
