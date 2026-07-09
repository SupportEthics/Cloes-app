import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GradientPhoto } from '@/components/GradientPhoto';
import { Screen } from '@/components/Screen';
import { useHiddenTags } from '@/data/auth';
import { makeId } from '@/data/seed';
import { useStore } from '@/data/store';
import { STATUS_META, STATUS_ORDER, TAG_META, type Status, type Tag } from '@/data/types';
import { fontRounded, radius, space, useTheme, type GradientKey } from '@/theme';

const VIBES: { emoji: string; gradient: GradientKey; label: string; kind: string }[] = [
  { emoji: '🌲', gradient: 'woods', label: 'Woods', kind: 'woods' },
  { emoji: '🏖️', gradient: 'beach', label: 'Beach', kind: 'beach' },
  { emoji: '🐐', gradient: 'farm', label: 'Farm', kind: 'farm' },
  { emoji: '🏰', gradient: 'castle', label: 'Castle', kind: 'castle' },
  { emoji: '🤸', gradient: 'soft', label: 'Play', kind: 'play' },
  { emoji: '🦕', gradient: 'museum', label: 'Museum', kind: 'museum' },
  { emoji: '🌳', gradient: 'park', label: 'Park', kind: 'park' },
];

const TAGS: Tag[] = ['toddler', 'rainy', 'free', 'outdoors', 'fullday', 'other'];
const STATUSES: { key: Status; label: string }[] = STATUS_ORDER.map((key) => ({ key, label: STATUS_META[key].label }));

export default function AddScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const { addPlace, addPhoto } = useStore();
  const hiddenTags = useHiddenTags();
  const visibleTags = TAGS.filter((t) => !hiddenTags.includes(t));
  const visibleVibes = VIBES.filter((v) => !hiddenTags.includes(v.kind));

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [vibeKey, setVibeKey] = useState<GradientKey>('woods');
  // If the chosen look gets hidden in preferences, fall back to the first visible.
  const activeVibe = visibleVibes.find((v) => v.gradient === vibeKey) ?? visibleVibes[0] ?? VIBES[0];
  const [tags, setTags] = useState<Set<Tag>>(new Set());
  const [status, setStatus] = useState<Status>('not_yet');
  const [cost, setCost] = useState('');
  const [note, setNote] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const toggleTag = (t: Tag) =>
    setTags((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });

  const pickPhotos = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.7,
    });
    if (!res.canceled) setPhotoUris((prev) => [...prev, ...res.assets.map((a) => a.uri)]);
  };

  const canSave = name.trim().length > 0;

  const save = async () => {
    // Guard against double-taps creating duplicates.
    if (!canSave || saved) return;
    // Show the confirmation the instant Save is tapped — never gate it behind the
    // network, so it always appears whether we're online, slow, or offline.
    setSaved(true);
    try {
      const place = await addPlace({
        name: name.trim(),
        location: location.trim() || undefined,
        emoji: activeVibe.emoji,
        gradient: activeVibe.gradient,
        status,
        tags: Array.from(tags),
        cost: cost.trim() || undefined,
        notes: note.trim() ? [note.trim()] : [],
      });
      photoUris.forEach((uri) => addPhoto(place.id, { id: makeId('photo'), uri }));
    } catch {
      // The place is already in the list optimistically; the cloud reconciles on reload.
    }
    // Always move on to the list, even if the cloud write was slow or errored.
    setTimeout(() => router.replace('/list'), 1100);
  };

  return (
    <View style={{ flex: 1 }}>
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: c.inkFaint }]}>NEW ADVENTURE</Text>
          <Text style={[styles.h1, { color: c.ink }]}>Add a place</Text>
        </View>
      </View>
      <Text style={[styles.blurb, { color: c.inkSoft }]}>
        Pop it on the list now — you can add photos and notes after your visit.
      </Text>

      <Field label="Where to?">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Lotherton Wildlife World"
          placeholderTextColor={c.inkFaint}
          style={[styles.input, styles.inputBig, { backgroundColor: c.card, borderColor: c.line, color: c.ink }]}
        />
      </Field>

      <Field label="Roughly where">
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Town or postcode"
          placeholderTextColor={c.inkFaint}
          style={[styles.input, { backgroundColor: c.card, borderColor: c.line, color: c.ink }]}
        />
      </Field>

      <Field label="Pick a look">
        <View style={styles.wrap}>
          {visibleVibes.map((v) => (
            <Pressable key={v.gradient} onPress={() => setVibeKey(v.gradient)} style={{ alignItems: 'center', gap: 4 }}>
              <GradientPhoto
                gradient={v.gradient}
                emoji={v.emoji}
                fontSize={22}
                radius={14}
                style={{
                  width: 52,
                  height: 52,
                  borderWidth: v.gradient === activeVibe.gradient ? 3 : 0,
                  borderColor: c.primary,
                }}
              />
              <Text style={{ fontSize: 10.5, color: c.inkSoft, fontWeight: '600' }}>{v.label}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="What kind of day out?">
        <View style={styles.wrap}>
          {visibleTags.map((t) => (
            <Pick key={t} on={tags.has(t)} onPress={() => toggleTag(t)} label={`${TAG_META[t].emoji} ${TAG_META[t].label}`} />
          ))}
        </View>
      </Field>

      <Field label="Status">
        <View style={styles.wrap}>
          {STATUSES.map((s) => (
            <Pick key={s.key} on={status === s.key} onPress={() => setStatus(s.key)} label={s.label} />
          ))}
        </View>
      </Field>

      <Field label="Cost">
        <TextInput
          value={cost}
          onChangeText={setCost}
          placeholder="Free / £ / ££"
          placeholderTextColor={c.inkFaint}
          style={[styles.input, { backgroundColor: c.card, borderColor: c.line, color: c.ink }]}
        />
      </Field>

      <Field label="Notes for next time">
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Book ahead · take a picnic…"
          placeholderTextColor={c.inkFaint}
          style={[styles.input, { backgroundColor: c.card, borderColor: c.line, color: c.ink }]}
        />
      </Field>

      <Field label="Add a few favourite photos">
        <View style={styles.photoRow}>
          <Pressable onPress={pickPhotos} style={[styles.addPhoto, { borderColor: c.line, backgroundColor: c.card2 }]}>
            <Text style={{ fontSize: 26, color: c.inkFaint }}>＋</Text>
          </Pressable>
          {photoUris.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.photo} />
          ))}
        </View>
      </Field>

      <Pressable
        onPress={save}
        disabled={!canSave || saved}
        style={[styles.cta, { backgroundColor: c.primary, opacity: canSave && !saved ? 1 : 0.5 }]}
      >
        <Text style={[styles.ctaText, { color: c.onPrimary }]}>Save to our adventures</Text>
      </Pressable>
      </Screen>

      {saved ? (
        <View style={styles.overlay} pointerEvents="auto">
          <View style={[styles.toast, { backgroundColor: c.card }]}>
            <View style={[styles.tick, { backgroundColor: c.primary }]}>
              <Text style={{ color: c.onPrimary, fontSize: 26, fontWeight: '800' }}>✓</Text>
            </View>
            <Text style={[styles.toastText, { color: c.ink }]}>Added to your adventures!</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  const { c } = useTheme();
  return (
    <View style={[{ marginTop: space.lg }, style]}>
      <Text style={[styles.label, { color: c.inkFaint }]}>{label}</Text>
      {children}
    </View>
  );
}

function Pick({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[
        styles.pick,
        { backgroundColor: on ? c.primaryTint : c.card, borderColor: on ? c.primary : c.line },
      ]}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: on ? c.primary : c.inkSoft }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', paddingTop: space.sm },
  eyebrow: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1 },
  h1: { fontSize: 24, fontWeight: '800', marginTop: 6, fontFamily: fontRounded },
  blurb: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  label: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15 },
  inputBig: { fontSize: 18, fontWeight: '700', fontFamily: fontRounded },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pick: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  twoCol: { flexDirection: 'row', gap: space.md },
  photoRow: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  addPhoto: { width: 96, height: 96, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  photo: { width: 96, height: 96, borderRadius: 14 },
  cta: { marginTop: space.xl, borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  ctaText: { fontSize: 15.5, fontWeight: '800', fontFamily: fontRounded },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, backgroundColor: 'rgba(20,31,27,0.45)', alignItems: 'center', justifyContent: 'center', padding: 40 },
  toast: { borderRadius: 22, paddingVertical: 28, paddingHorizontal: 34, alignItems: 'center', gap: 14, maxWidth: 300 },
  tick: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  toastText: { fontSize: 16, fontWeight: '800', fontFamily: fontRounded, textAlign: 'center' },
});
