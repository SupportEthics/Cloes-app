import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { useStore } from '@/data/store';
import { fontRounded, radius, space, useTheme } from '@/theme';

const MEMBERS = [
  { name: 'Cloe', role: 'Adventure keeper', colors: ['#2E6B4E', '#8FBF7E'] as const },
  { name: 'Sean', role: 'Co-pilot', colors: ['#48B4C4', '#F4D384'] as const },
  { name: 'Ivy', role: 'Chief explorer', colors: ['#FF7EA9', '#79C4F5'] as const },
];

export default function FamilyScreen() {
  const { c } = useTheme();
  const { places } = useStore();
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

      <Pressable style={[styles.invite, { backgroundColor: c.primaryTint }]}>
        <Text style={[styles.inviteText, { color: c.primary }]}>＋ Invite a family member</Text>
      </Pressable>

      <View style={[styles.summary, { backgroundColor: c.card, borderColor: c.line }]}>
        <Text style={[styles.summaryTitle, { color: c.ink }]}>One shared journal</Text>
        <Text style={[styles.summaryBody, { color: c.inkSoft }]}>
          Everyone in your crew sees the same list and memories. You've logged {visited}{' '}
          {visited === 1 ? 'place' : 'places'} together so far — here's to many more. 🌱
        </Text>
      </View>

      <Text style={[styles.footer, { color: c.inkFaint }]}>Trove · your family's adventure book</Text>
    </Screen>
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
  invite: { marginTop: space.md, borderRadius: 14, padding: 15, alignItems: 'center' },
  inviteText: { fontSize: 14.5, fontWeight: '800', fontFamily: fontRounded },
  summary: { marginTop: space.lg, borderRadius: radius.md, borderWidth: 1, padding: 16 },
  summaryTitle: { fontSize: 15.5, fontWeight: '800', fontFamily: fontRounded },
  summaryBody: { fontSize: 13.5, marginTop: 6, lineHeight: 19 },
  footer: { textAlign: 'center', marginTop: space.xl, fontSize: 12 },
});
