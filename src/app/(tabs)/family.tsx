import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/data/auth';
import { getInviteCode, joinFamilyByCode } from '@/data/cloud';
import { useStore } from '@/data/store';
import { fontRounded, radius, space, useTheme } from '@/theme';

const MEMBERS = [
  { name: 'Cloe', role: 'Adventure keeper', colors: ['#2E6B4E', '#8FBF7E'] as const },
  { name: 'Sean', role: 'Co-pilot', colors: ['#48B4C4', '#F4D384'] as const },
];

export default function FamilyScreen() {
  const { c } = useTheme();
  const { places, cloud, familyId, reconnect } = useStore();
  const { user, signOut } = useAuth();
  const visited = places.filter((p) => p.visits.length).length;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: c.inkFaint }]}>YOUR CREW</Text>
        <Text style={[styles.h1, { color: c.ink }]}>The family</Text>
      </View>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
        {MEMBERS.map((m, i) => (
          <View key={m.name} style={[styles.member, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}>
            <LinearGradient colors={m.colors} style={styles.avatar}>
              <Text style={styles.avatarText}>{m.name.charAt(0)}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberName, { color: c.ink }]}>{m.name}</Text>
              <Text style={[styles.memberRole, { color: c.inkSoft }]}>{m.role}</Text>
            </View>
          </View>
        ))}
      </View>

      {cloud ? (
        <CloudPanel familyId={familyId} email={user?.email ?? null} onJoined={reconnect} onSignOut={signOut} />
      ) : (
        <View style={[styles.summary, { backgroundColor: c.card, borderColor: c.line }]}>
          <Text style={[styles.summaryTitle, { color: c.ink }]}>Sharing is off</Text>
          <Text style={[styles.summaryBody, { color: c.inkSoft }]}>
            Right now this journal lives on this device only. Turn on cloud sync (see the app's README) to share one
            journal across both your phones — you've logged {visited} {visited === 1 ? 'place' : 'places'} so far. 🌱
          </Text>
        </View>
      )}

      <Text style={[styles.footer, { color: c.inkFaint }]}>Trove · your family's adventure book</Text>
    </Screen>
  );
}

function CloudPanel({
  familyId,
  email,
  onJoined,
  onSignOut,
}: {
  familyId: string | null;
  email: string | null;
  onJoined: () => void;
  onSignOut: () => void;
}) {
  const { c } = useTheme();
  const [code, setCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (familyId) getInviteCode(familyId).then((v) => active && setCode(v)).catch(() => {});
    return () => {
      active = false;
    };
  }, [familyId]);

  const join = async () => {
    if (!joinCode.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      await joinFamilyByCode(joinCode);
      setJoinCode('');
      setMsg('Joined! Your journals are now shared.');
      onJoined();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "That code didn't work — double-check it.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={[styles.summary, { backgroundColor: c.primaryTint, borderColor: c.primaryTint }]}>
        <Text style={[styles.summaryTitle, { color: c.primary }]}>One shared journal ✓</Text>
        <Text style={[styles.summaryBody, { color: c.primary }]}>
          Signed in as {email}. Everything you add syncs to everyone in your family.
        </Text>
      </View>

      <View style={[styles.summary, { backgroundColor: c.card, borderColor: c.line }]}>
        <Text style={[styles.summaryTitle, { color: c.ink }]}>Invite your family</Text>
        <Text style={[styles.summaryBody, { color: c.inkSoft }]}>Share this code so they can join your journal:</Text>
        <Text style={[styles.code, { color: c.ink, backgroundColor: c.card2, borderColor: c.line }]}>{code ?? '····'}</Text>
        {code ? (
          <Pressable
            onPress={() =>
              Share.share({
                message: `Join our family adventure journal on Trove! 🌱 Open https://supportethics.github.io/Cloes-app/ , create an account, then enter invite code ${code} under Family → Join a family.`,
              }).catch(() => {})
            }
            style={[styles.shareBtn, { backgroundColor: c.primary }]}
          >
            <Text style={{ color: c.onPrimary, fontWeight: '800', fontFamily: fontRounded }}>Share invite</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.summary, { backgroundColor: c.card, borderColor: c.line }]}>
        <Text style={[styles.summaryTitle, { color: c.ink }]}>Join a family</Text>
        <Text style={[styles.summaryBody, { color: c.inkSoft }]}>Got a code from your partner? Enter it here.</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TextInput
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="Invite code"
            placeholderTextColor={c.inkFaint}
            autoCapitalize="characters"
            style={[styles.input, { backgroundColor: c.card2, borderColor: c.line, color: c.ink }]}
          />
          <Pressable onPress={join} disabled={busy} style={[styles.joinBtn, { backgroundColor: c.primary, opacity: busy ? 0.6 : 1 }]}>
            <Text style={{ color: c.onPrimary, fontWeight: '800', fontFamily: fontRounded }}>Join</Text>
          </Pressable>
        </View>
        {msg ? <Text style={[styles.summaryBody, { color: c.primary, marginTop: 10 }]}>{msg}</Text> : null}
      </View>

      <Pressable onPress={onSignOut} style={styles.signout}>
        <Text style={[styles.signoutText, { color: c.clay }]}>Sign out</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: space.sm, paddingBottom: space.lg },
  eyebrow: { fontSize: 11.5, fontWeight: '700', letterSpacing: 1 },
  h1: { fontSize: 24, fontWeight: '800', marginTop: 6, fontFamily: fontRounded },
  card: { borderRadius: radius.md, borderWidth: 1 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18, fontFamily: fontRounded },
  memberName: { fontSize: 15.5, fontWeight: '800' },
  memberRole: { fontSize: 12.5, marginTop: 2 },
  summary: { marginTop: space.lg, borderRadius: radius.md, borderWidth: 1, padding: 16 },
  summaryTitle: { fontSize: 15.5, fontWeight: '800', fontFamily: fontRounded },
  summaryBody: { fontSize: 13.5, marginTop: 6, lineHeight: 19 },
  code: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: fontRounded,
    letterSpacing: 3,
    textAlign: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  shareBtn: { marginTop: 12, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 15, letterSpacing: 1 },
  joinBtn: { paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  signout: { alignItems: 'center', marginTop: space.lg, padding: 10 },
  signoutText: { fontSize: 14, fontWeight: '700' },
  footer: { textAlign: 'center', marginTop: space.xl, fontSize: 12 },
});
