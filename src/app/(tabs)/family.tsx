import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/data/auth';
import { getInviteCode, joinFamilyByCode, listFamilyMembers, removeFamilyMember, type FamilyMember } from '@/data/cloud';
import { useStore } from '@/data/store';
import { fontRounded, radius, space, useTheme } from '@/theme';

const AVATAR_COLOURS: readonly (readonly [string, string])[] = [
  ['#2E6B4E', '#8FBF7E'],
  ['#48B4C4', '#F4D384'],
  ['#FF7EA9', '#79C4F5'],
  ['#7C6BA0', '#C6A05B'],
  ['#E79B45', '#A7C24E'],
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

      {cloud ? (
        <CloudPanel
          familyId={familyId}
          myUserId={user?.id ?? null}
          email={user?.email ?? null}
          onChanged={reconnect}
          onSignOut={signOut}
        />
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
  myUserId,
  email,
  onChanged,
  onSignOut,
}: {
  familyId: string | null;
  myUserId: string | null;
  email: string | null;
  onChanged: () => void;
  onSignOut: () => void;
}) {
  const { c } = useTheme();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const loadMembers = useCallback(() => {
    if (!familyId) return;
    listFamilyMembers(familyId)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [familyId]);

  useEffect(() => {
    let active = true;
    if (familyId) {
      getInviteCode(familyId).then((v) => active && setCode(v)).catch(() => {});
      loadMembers();
    }
    return () => {
      active = false;
    };
  }, [familyId, loadMembers]);

  const remove = async (m: FamilyMember) => {
    if (!familyId) return;
    if (confirmRemove !== m.userId) {
      setConfirmRemove(m.userId); // first tap arms it; second tap confirms
      setTimeout(() => setConfirmRemove((v) => (v === m.userId ? null : v)), 4000);
      return;
    }
    setConfirmRemove(null);
    try {
      await removeFamilyMember(familyId, m.userId);
      if (m.userId === myUserId) {
        onChanged(); // we left — reconnect to whatever family is ours now
      } else {
        setMsg(`${m.name} removed from the family.`);
        loadMembers();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't remove that member.");
    }
  };

  return (
    <>
      {/* Real members, live from the family */}
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
        {members.length === 0 ? (
          <Text style={[styles.summaryBody, { color: c.inkSoft, padding: 14 }]}>Loading your crew…</Text>
        ) : (
          members.map((m, i) => {
            const isMe = m.userId === myUserId;
            const arming = confirmRemove === m.userId;
            return (
              <View key={m.userId} style={[styles.member, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}>
                <LinearGradient colors={AVATAR_COLOURS[i % AVATAR_COLOURS.length]} style={styles.avatar}>
                  <Text style={styles.avatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: c.ink }]}>
                    {m.name}
                    {isMe ? '  (you)' : ''}
                  </Text>
                  <Text style={[styles.memberRole, { color: c.inkSoft }]}>{isMe ? 'Signed in on this phone' : 'Family member'}</Text>
                </View>
                <Pressable
                  onPress={() => remove(m)}
                  style={[styles.removeBtn, { backgroundColor: arming ? c.clay : c.clayTint }]}
                >
                  <Text style={{ color: arming ? '#fff' : c.clay, fontWeight: '700', fontSize: 12 }}>
                    {arming ? 'Tap to confirm' : isMe ? 'Leave' : 'Remove'}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </View>

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
          <Pressable
            onPress={async () => {
              if (!joinCode.trim()) return;
              setBusy(true);
              setMsg(null);
              try {
                await joinFamilyByCode(joinCode);
                setJoinCode('');
                setMsg('Joined! Your journals are now shared.');
                onChanged();
              } catch (e) {
                setMsg(e instanceof Error ? e.message : "That code didn't work — double-check it.");
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            style={[styles.joinBtn, { backgroundColor: c.primary, opacity: busy ? 0.6 : 1 }]}
          >
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
  removeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
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
