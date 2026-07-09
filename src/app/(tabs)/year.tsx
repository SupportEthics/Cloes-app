import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GradientPhoto } from '@/components/GradientPhoto';
import { Screen } from '@/components/Screen';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '@/data/store';
import { displayRating } from '@/data/types';
import { fontRounded, radius, space, useTheme } from '@/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function YearScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const { places } = useStore();
  const year = new Date().getFullYear();

  const totalVisits = places.reduce((n, p) => n + p.visits.length, 0);
  const placesVisited = places.filter((p) => p.visits.length > 0).length;
  const photos = places.reduce((n, p) => n + p.photos.length, 0);

  // Visits bucketed across the last 7 calendar months (robust across year end).
  const buckets = useMemo(() => {
    const now = new Date();
    const b = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
      return { label: MONTHS[d.getMonth()][0], y: d.getFullYear(), m: d.getMonth(), count: 0 };
    });
    places.forEach((p) =>
      p.visits.forEach((v) => {
        const d = new Date(v.date);
        const hit = b.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
        if (hit) hit.count += 1;
      }),
    );
    return b;
  }, [places]);
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  const faves = places
    .filter((p) => p.status === 'would_again')
    .sort((a, b) => b.visits.length - a.visits.length)
    .slice(0, 3);

  const collage = places.filter((p) => p.photos.length || p.visits.length).slice(0, 6);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: c.inkFaint }]}>LOOK BACK</Text>
        <Text style={[styles.h1, { color: c.ink }]}>Year in adventures</Text>
      </View>

      <LinearGradient colors={['#1F5A4C', '#3FA07E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroDeco}>🗺️</Text>
        <Text style={styles.heroEyebrow}>{year}</Text>
        <Text style={styles.heroTitle}>
          You've made {totalVisits} {totalVisits === 1 ? 'memory' : 'memories'} together
        </Text>
        <Text style={styles.heroP}>
          Across {placesVisited} {placesVisited === 1 ? 'place' : 'places'} — and there are still{' '}
          {places.filter((p) => p.status === 'not_yet').length} waiting on your list.
        </Text>
      </LinearGradient>

      <View style={styles.bigStats}>
        <BigStat n={totalVisits} label="Adventures" />
        <BigStat n={placesVisited} label="Places" />
        <BigStat n={photos} label="Photos kept" />
      </View>

      <Text style={[styles.sectionH, { color: c.ink }]}>Trips each month</Text>
      <View style={styles.chart}>
        {buckets.map((b, i) => {
          const isMax = b.count === maxCount && b.count > 0;
          return (
            <View key={i} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(6, (b.count / maxCount) * 100)}%`,
                    backgroundColor: isMax ? c.coral : c.primaryTint,
                  },
                ]}
              />
              <Text style={[styles.barLabel, { color: c.inkFaint }]}>{b.label}</Text>
            </View>
          );
        })}
      </View>

      {faves.length ? (
        <>
          <Text style={[styles.sectionH, { color: c.ink }]}>Would do again ⭐</Text>
          <View style={{ gap: 10 }}>
            {faves.map((p, i) => {
              const r = displayRating(p);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/place/${p.id}`)}
                  style={[styles.topRow, { backgroundColor: c.card, borderColor: c.line }]}
                >
                  <Text style={[styles.rank, { color: c.primary }]}>{i + 1}</Text>
                  <GradientPhoto gradient={p.gradient} emoji={p.emoji} fontSize={20} radius={10} style={{ width: 40, height: 40 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.topName, { color: c.ink }]}>{p.name}</Text>
                    <Text style={[styles.topSub, { color: c.inkSoft }]}>
                      Visited {p.visits.length} {p.visits.length === 1 ? 'time' : 'times'}
                    </Text>
                  </View>
                  <Text style={[styles.rating, { color: c.star }]}>★ {r ? r.toFixed(1) : '—'}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {collage.length ? (
        <>
          <Text style={[styles.sectionH, { color: c.ink }]}>Memory collage</Text>
          <View style={styles.collage}>
            {collage.map((p) => (
              <GradientPhoto key={p.id} gradient={p.gradient} emoji={p.emoji} fontSize={30} radius={12} style={styles.collageTile} />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function BigStat({ n, label }: { n: number; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.bigN, { color: c.primary }]}>{n}</Text>
      <Text style={[styles.bigL, { color: c.inkSoft }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: space.sm, paddingBottom: space.sm },
  eyebrow: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1 },
  h1: { fontSize: 24, fontWeight: '800', marginTop: 6, fontFamily: fontRounded },

  hero: { borderRadius: radius.lg, padding: 22, overflow: 'hidden' },
  heroDeco: { position: 'absolute', right: -14, bottom: -22, fontSize: 110, opacity: 0.2 },
  heroEyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 25, fontWeight: '800', marginTop: 6, fontFamily: fontRounded },
  heroP: { color: 'rgba(255,255,255,0.92)', fontSize: 13.5, marginTop: 8, maxWidth: '90%', lineHeight: 19 },

  bigStats: { flexDirection: 'row', marginTop: 20 },
  bigN: { fontSize: 26, fontWeight: '800', fontFamily: fontRounded },
  bigL: { fontSize: 11.5, marginTop: 5 },

  sectionH: { fontSize: 16, fontWeight: '800', marginTop: 26, marginBottom: 12, fontFamily: fontRounded },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 132 },
  barCol: { flex: 1, alignItems: 'stretch', justifyContent: 'flex-end', height: '100%' },
  bar: { borderRadius: 7, minHeight: 8 },
  barLabel: { fontSize: 10.5, fontWeight: '600', textAlign: 'center', marginTop: 8 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 11 },
  rank: { fontSize: 18, fontWeight: '800', width: 22, fontFamily: fontRounded },
  topName: { fontSize: 14.5, fontWeight: '800' },
  topSub: { fontSize: 12, marginTop: 2 },
  rating: { fontSize: 12.5, fontWeight: '700' },

  collage: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  collageTile: { width: '31.5%', aspectRatio: 1 },
});
