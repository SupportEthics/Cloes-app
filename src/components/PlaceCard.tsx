import { useRouter } from 'expo-router';
import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { useHiddenTags } from '@/data/auth';
import { displayRating, TAG_META, type Place } from '@/data/types';
import { fontRounded, radius, space, useTheme } from '@/theme';
import { GradientPhoto } from './GradientPhoto';
import { StatusPill } from './StatusPill';

export function PlaceCard({ place }: { place: Place }) {
  const { c } = useTheme();
  const router = useRouter();
  const rating = displayRating(place) ?? place.googleRating;
  const heroUri = place.photos.find((ph) => ph.uri)?.uri;
  const hiddenTags = useHiddenTags();
  const shownTags = place.tags.filter((t) => !hiddenTags.includes(t));

  const overlay = (
    <>
      <StatusPill status={place.status} style={styles.pill} />
      {place.status === 'would_again' ? <Text style={styles.heart}>❤️</Text> : null}
    </>
  );

  return (
    <Pressable
      onPress={() => router.push(`/place/${place.id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.card, borderColor: c.line, transform: [{ scale: pressed ? 0.985 : 1 }] },
      ]}
    >
      {heroUri ? (
        <ImageBackground source={{ uri: heroUri }} style={{ height: 118 }} resizeMode="cover">
          {overlay}
        </ImageBackground>
      ) : (
        <GradientPhoto gradient={place.gradient} emoji={place.emoji} fontSize={46} height={118}>
          {overlay}
        </GradientPhoto>
      )}

      <View style={styles.body}>
        <Text style={[styles.name, { color: c.ink }]}>{place.name}</Text>
        <View style={styles.meta}>
          {place.location ? <Text style={[styles.metaItem, { color: c.inkSoft }]}>📍 {place.location}</Text> : null}
          {place.cost ? <Text style={[styles.metaItem, { color: c.inkSoft }]}>💷 {place.cost}</Text> : null}
          <Text style={[styles.metaItem, { color: c.star }]}>★ {rating ? rating.toFixed(1) : '—'}</Text>
        </View>
        <View style={styles.tags}>
          {shownTags.slice(0, 3).map((t) => (
            <View key={t} style={[styles.tag, { backgroundColor: c.card2 }]}>
              <Text style={[styles.tagText, { color: c.inkSoft }]}>{TAG_META[t].label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  pill: { position: 'absolute', top: 10, left: 10 },
  heart: { position: 'absolute', top: 10, right: 12, fontSize: 15 },
  body: { padding: 14 },
  name: { fontSize: 16, fontWeight: '800', fontFamily: fontRounded },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 9 },
  metaItem: { fontSize: 12.5, fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: 11 },
  tag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  tagText: { fontSize: 11, fontWeight: '700' },
});
