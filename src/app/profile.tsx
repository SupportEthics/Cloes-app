import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/data/auth';
import { fontRounded, radius, space, useTheme } from '@/theme';

export default function ProfileScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const { user, cloud, updateProfile, signOut } = useAuth();

  const initialName = (user?.user_metadata?.display_name as string | undefined) ?? '';
  const initialTown = (user?.user_metadata?.home_town as string | undefined) ?? '';
  const [name, setName] = useState(initialName);
  const [town, setTown] = useState(initialTown);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = name !== initialName || town !== initialTown;

  const save = async () => {
    if (!dirty || busy) return;
    setBusy(true);
    setError(null);
    const res = await updateProfile({ name, homeTown: town });
    setBusy(false);
    if (res.error) setError(res.error);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    }
  };

  const letter = (name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.surface }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.back, { backgroundColor: c.card, borderColor: c.line }]}>
          <Text style={{ fontSize: 20, color: c.ink, marginTop: -2 }}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { color: c.ink }]}>Your profile</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.body}>
        <LinearGradient colors={['#2E6B4E', '#8FBF7E']} style={styles.avatar}>
          <Text style={styles.avatarText}>{letter}</Text>
        </LinearGradient>
        {user?.email ? <Text style={[styles.email, { color: c.inkSoft }]}>{user.email}</Text> : null}

        {cloud && user ? (
          <>
            <Field label="Your name">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Cloe"
                placeholderTextColor={c.inkFaint}
                autoCapitalize="words"
                style={[styles.input, { backgroundColor: c.card, borderColor: c.line, color: c.ink }]}
              />
            </Field>
            <Field label="Home town">
              <TextInput
                value={town}
                onChangeText={setTown}
                placeholder="e.g. Ilkley"
                placeholderTextColor={c.inkFaint}
                autoCapitalize="words"
                style={[styles.input, { backgroundColor: c.card, borderColor: c.line, color: c.ink }]}
              />
            </Field>

            {error ? <Text style={[styles.msg, { color: c.clay }]}>{error}</Text> : null}
            {saved ? <Text style={[styles.msg, { color: c.primary }]}>Saved ✓</Text> : null}

            <Pressable onPress={save} disabled={!dirty || busy} style={[styles.cta, { backgroundColor: c.primary, opacity: dirty && !busy ? 1 : 0.5 }]}>
              <Text style={[styles.ctaText, { color: c.onPrimary }]}>{busy ? 'Saving…' : 'Save changes'}</Text>
            </Pressable>

            <Pressable onPress={signOut} style={styles.signout}>
              <Text style={[styles.signoutText, { color: c.clay }]}>Sign out</Text>
            </Pressable>

            <Pressable onPress={() => router.push('/debug')} style={styles.signout}>
              <Text style={[styles.signoutText, { color: c.inkFaint }]}>Run sync check</Text>
            </Pressable>
          </>
        ) : (
          <Text style={[styles.note, { color: c.inkSoft }]}>
            Profiles and sign-in are part of cloud sync. Once it's switched on, this is where you'll edit your name and
            home town.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ width: '100%', marginTop: space.lg }}>
      <Text style={[styles.label, { color: c.inkFaint }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingVertical: space.md },
  back: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', fontFamily: fontRounded },
  body: { paddingHorizontal: space.xl, alignItems: 'center', paddingTop: space.lg },
  avatar: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 34, fontFamily: fontRounded },
  email: { fontSize: 14, marginTop: 12 },
  label: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 14, padding: 15, fontSize: 16, width: '100%' },
  msg: { fontSize: 13.5, marginTop: 14, fontWeight: '600' },
  cta: { marginTop: space.xl, borderRadius: 16, padding: 16, alignItems: 'center', width: '100%' },
  ctaText: { fontSize: 15.5, fontWeight: '800', fontFamily: fontRounded },
  signout: { marginTop: space.lg, padding: 10 },
  signoutText: { fontSize: 14, fontWeight: '700' },
  note: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: space.lg },
});
