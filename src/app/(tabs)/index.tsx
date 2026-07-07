import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { buildNudges, todayWeather } from '@/data/nudges';
import { useStore } from '@/data/store';
import { fontRounded, radius, space, useTheme } from '@/theme';

const FAMILY_NAME = 'Cloe';
const HOME_TOWN = 'Ilkley';

export default function HomeScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const { places } = useStore();
  const weather = todayWeather();

  const nudges = useMemo(() => buildNudges(places), [places]);
  const hero = nudges.find((n) => n.kind === 'sunny');
  const rows = nudges.filter((n) => n.kind !== 'sunny');

  const totalVisits = places.reduce((n, p) => n + p.visits.length, 0);
  const onList = places.filter((p) => p.status === 'not_yet').length;
  const photos = places.reduce((n, p) => n + p.photos.length, 0);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const hours = new Date().getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <Screen>
      {/* Greeting */}
      <View style={styles.greet}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.h1, { color: c.ink }]}>
            {greeting},{'\n'}
            {FAMILY_NAME} ☀️
          </Text>
          <Text style={[styles.sub, { color: c.inkSoft }]}>
            {today} · {HOME_TOWN}
          </Text>
          <View style={[styles.weatherChip, { backgroundColor: c.coralTint }]}>
            <Text style={[styles.weatherText, { color: c.coral }]}>☀️ {weather.summary}</Text>
          </View>
        </View>
        <LinearGradient colors={['#2E6B4E', '#8FBF7E']} style={styles.avatar}>
          <Text style={styles.avatarText}>{FAMILY_NAME.charAt(0)}</Text>
        </LinearGradient>
      </View>

      {/* Hero nudge */}
      {hero ? (
        <Pressable onPress={() => hero.placeId && router.push(`/place/${hero.placeId}`)}>
          <LinearGradient colors={['#FF8A5B', '#E8542E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.heroSun}>☀️</Text>
            <Text style={styles.heroKicker}>SUNNY TODAY</Text>
            <Text style={styles.heroTitle}>Why not revisit an outdoor favourite?</Text>
            <View style={styles.heroPlace}>
              <Text style={styles.heroPlaceText}>{hero.subtitle}</Text>
            </View>
          </LinearGradient>
        </Pressable>
      ) : null}

      {/* For you today */}
      {rows.length ? (
        <>
          <Text style={[styles.sectionH, { color: c.ink }]}>For you today</Text>
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
            {rows.map((n, i) => (
              <Pressable
                key={n.id}
                onPress={() => (n.placeId ? router.push(`/place/${n.placeId}`) : router.push('/list'))}
                style={[styles.nudgeRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}
              >
                <View style={[styles.nudgeIcon, { backgroundColor: c.primaryTint }]}>
                  <Text style={{ fontSize: 19 }}>{n.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nudgeTitle, { color: c.ink }]}>{n.title}</Text>
                  <Text style={[styles.nudgeSub, { color: c.inkSoft }]}>{n.subtitle}</Text>
                </View>
                <Text style={[styles.chev, { color: c.inkFaint }]}>›</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {/* Year so far */}
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionH, { color: c.ink, marginTop: 0 }]}>Your year so far</Text>
        <Pressable onPress={() => router.push('/year')}>
          <Text style={[styles.link, { color: c.primary }]}>See summary</Text>
        </Pressable>
      </View>
      <View style={styles.stats}>
        <Stat n={totalVisits} label="Adventures" />
        <Stat n={onList} label="On the list" />
        <Stat n={photos} label="Photos kept" />
      </View>
    </Screen>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.line }]}>
      <Text style={[styles.statN, { color: c.ink }]}>{n}</Text>
      <Text style={[styles.statL, { color: c.inkSoft }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greet: { flexDirection: 'row', gap: space.md, paddingTop: space.sm, paddingBottom: space.lg },
  h1: { fontSize: 26, lineHeight: 30, fontWeight: '800', fontFamily: fontRounded },
  sub: { fontSize: 13.5, marginTop: 4 },
  weatherChip: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  weatherText: { fontSize: 12.5, fontWeight: '700' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 17, fontFamily: fontRounded },

  hero: { borderRadius: radius.lg, padding: 20, overflow: 'hidden' },
  heroSun: { position: 'absolute', right: -20, top: -26, fontSize: 120, opacity: 0.25 },
  heroKicker: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1, opacity: 0.92 },
  heroTitle: { color: '#fff', fontSize: 21, fontWeight: '800', marginTop: 8, maxWidth: '85%', fontFamily: fontRounded },
  heroPlace: { marginTop: 16, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, alignSelf: 'flex-start' },
  heroPlaceText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },

  sectionH: { fontSize: 17, fontWeight: '800', marginTop: 22, marginBottom: 12, fontFamily: fontRounded },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 12 },
  link: { fontSize: 13, fontWeight: '700' },

  card: { borderRadius: radius.md, borderWidth: 1 },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14 },
  nudgeIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nudgeTitle: { fontSize: 14.5, fontWeight: '700' },
  nudgeSub: { fontSize: 12.5, marginTop: 2 },
  chev: { fontSize: 22 },

  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, borderRadius: radius.sm, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  statN: { fontSize: 22, fontWeight: '800', fontFamily: fontRounded },
  statL: { fontSize: 11, marginTop: 5 },
});
