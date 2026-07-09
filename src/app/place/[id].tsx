import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientPhoto } from '@/components/GradientPhoto';
import { makeId } from '@/data/seed';
import { useStore } from '@/data/store';
import { averageRating, lastVisit, STATUS_META, type Status } from '@/data/types';
import { humanSince } from '@/data/nudges';
import { fontRounded, radius, space, useTheme, type Palette } from '@/theme';

const VERDICTS: { key: Status; label: string; color: keyof Palette }[] = [
  { key: 'not_yet', label: 'To-do', color: 'amber' },
  { key: 'would_again', label: 'Would do again', color: 'primary' },
  { key: 'might_again', label: 'Might do again', color: 'sky' },
  { key: 'wouldnt_again', label: "Wouldn't do again", color: 'clay' },
];

export default function PlaceDetail() {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPlace, setStatus, logVisit, addPhoto } = useStore();
  const [hearted, setHearted] = useState(true);

  const place = getPlace(id);

  if (!place) {
    return (
      <View style={[styles.missing, { backgroundColor: c.surface }]}>
        <Text style={{ color: c.ink, fontSize: 16, fontFamily: fontRounded, fontWeight: '700' }}>This place has moved on.</Text>
        <Pressable onPress={() => router.back()} style={[styles.cta, { backgroundColor: c.primary, marginTop: 16 }]}>
          <Text style={[styles.ctaText, { color: c.onPrimary }]}>Back to the list</Text>
        </Pressable>
      </View>
    );
  }

  const last = lastVisit(place);
  const rating = averageRating(place);
  const recent = place.visits[0];
  const heroUri = place.photos.find((ph) => ph.uri)?.uri;

  const heroButtons = (
    <>
      <Pressable
        onPress={() => router.back()}
        style={[styles.circleBtn, { top: insets.top + 6, left: 16 }]}
        accessibilityLabel="Back"
      >
        <Text style={styles.circleIcon}>‹</Text>
      </Pressable>
      <Pressable
        onPress={() => setHearted((h) => !h)}
        style={[styles.circleBtn, { top: insets.top + 6, right: 16 }]}
        accessibilityLabel="Favourite"
      >
        <Text style={{ fontSize: 17 }}>{hearted ? '❤️' : '🤍'}</Text>
      </Pressable>
    </>
  );

  const addPhotos = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, selectionLimit: 4, allowsMultipleSelection: true });
    if (!res.canceled) res.assets.forEach((a) => addPhoto(place.id, { id: makeId('photo'), uri: a.uri }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Hero */}
        {heroUri ? (
          <ImageBackground source={{ uri: heroUri }} style={{ height: 250 }} resizeMode="cover">
            {heroButtons}
          </ImageBackground>
        ) : (
          <GradientPhoto gradient={place.gradient} emoji={place.emoji} fontSize={82} height={250}>
            {heroButtons}
          </GradientPhoto>
        )}

        <View style={styles.body}>
          <Text style={[styles.name, { color: c.ink }]}>{place.name}</Text>
          {place.location ? <Text style={[styles.loc, { color: c.inkSoft }]}>📍 {place.location}</Text> : null}

          <View style={[styles.lastVisit, { backgroundColor: last ? c.primaryTint : c.amberTint }]}>
            <Text style={[styles.lastVisitText, { color: last ? c.primary : c.amber }]}>
              {last ? `🗓️ Last visited ${humanSince(last)}` : '◦ On your bucket list — not visited yet'}
            </Text>
          </View>

          {/* Verdict */}
          <Text style={[styles.segLabel, { color: c.inkFaint }]}>YOUR VERDICT</Text>
          <View style={styles.segment}>
            {VERDICTS.map((v) => {
              const on = place.status === v.key;
              return (
                <Pressable
                  key={v.key}
                  onPress={() => setStatus(place.id, v.key)}
                  style={[
                    styles.segBtn,
                    { backgroundColor: on ? c[v.color] : c.card, borderColor: on ? c[v.color] : c.line },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: on ? '#fff' : c[v.color] }]} />
                  <Text style={[styles.segText, { color: on ? '#fff' : c.inkSoft }]}>{v.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Stats */}
          <View style={styles.statGrid}>
            <DStat k="Rating" v={rating ? `★ ${rating.toFixed(1)}` : '—'} color={c.star} />
            <DStat k="Cost" v={place.cost ?? '—'} />
            {place.location ? <DStat k="Where" v={place.location} /> : null}
            <DStat k="Who came" v={recent?.companions?.join(', ') ?? '—'} />
          </View>

          {/* Notes */}
          {place.notes.length ? (
            <>
              <Text style={[styles.sectionH, { color: c.ink }]}>Notes for next time</Text>
              <View style={{ gap: 0 }}>
                {place.notes.map((n, i) => (
                  <View key={i} style={[styles.note, i > 0 && { borderTopWidth: 1, borderTopColor: c.line, borderStyle: 'dashed' }]}>
                    <Text style={{ color: c.coral, fontSize: 15 }}>📌</Text>
                    <Text style={[styles.noteText, { color: c.ink }]}>{n}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* Memories */}
          <Text style={[styles.sectionH, { color: c.ink }]}>
            Memories {place.photos.length ? `· ${place.photos.length}` : ''}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9 }}>
            {place.photos.map((ph) =>
              ph.uri ? (
                <Image key={ph.id} source={{ uri: ph.uri }} style={styles.photo} />
              ) : (
                <GradientPhoto key={ph.id} gradient={place.gradient} emoji={ph.emoji} fontSize={34} radius={14} style={styles.photo} />
              ),
            )}
            <Pressable onPress={addPhotos} style={[styles.photo, styles.addPhoto, { borderColor: c.line, backgroundColor: c.card2 }]}>
              <Text style={{ fontSize: 26, color: c.inkFaint }}>＋</Text>
            </Pressable>
          </ScrollView>

          <Pressable onPress={() => logVisit(place.id)} style={[styles.cta, { backgroundColor: c.primary }]}>
            <Text style={[styles.ctaText, { color: c.onPrimary }]}>＋ Log a visit for today</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function DStat({ k, v, color }: { k: string; v: string; color?: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.dstat, { backgroundColor: c.card, borderColor: c.line }]}>
      <Text style={[styles.dstatK, { color: c.inkFaint }]}>{k.toUpperCase()}</Text>
      <Text style={[styles.dstatV, { color: color ?? c.ink }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  circleBtn: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleIcon: { fontSize: 22, color: '#22312B', marginTop: -2 },
  body: { paddingHorizontal: space.lg, paddingTop: space.lg },
  name: { fontSize: 24, fontWeight: '800', fontFamily: fontRounded },
  loc: { fontSize: 13, marginTop: 5 },
  lastVisit: { marginTop: 14, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, alignSelf: 'flex-start' },
  lastVisitText: { fontSize: 13.5, fontWeight: '700' },

  segLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 22, marginBottom: 10 },
  segment: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  segText: { fontSize: 13, fontWeight: '700' },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
  dstat: { width: '48%', borderRadius: 14, borderWidth: 1, padding: 13 },
  dstatK: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4 },
  dstatV: { fontSize: 16, fontWeight: '800', marginTop: 5, fontFamily: fontRounded },

  sectionH: { fontSize: 16, fontWeight: '800', marginTop: 24, marginBottom: 12, fontFamily: fontRounded },
  note: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', paddingVertical: 12 },
  noteText: { flex: 1, fontSize: 14, lineHeight: 20 },

  photo: { width: 96, height: 96, borderRadius: 14 },
  addPhoto: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },

  cta: { marginTop: 24, borderRadius: 16, padding: 16, alignItems: 'center' },
  ctaText: { fontSize: 15.5, fontWeight: '800', fontFamily: fontRounded },
});
