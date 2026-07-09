import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { makeId } from '@/data/seed';
import { isCloudConfigured, supabase } from '@/data/supabase';
import { fontRounded, space, useTheme } from '@/theme';
import { BUILD } from '@/version';

/**
 * Sync check — a self-diagnosis page. Runs a real write → read → delete against
 * the family database and prints every step verbatim, so a single screenshot
 * shows exactly where (and why) saving fails. Reached from Profile or /debug.
 */
export default function DebugScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const out: string[] = [];
    const log = (s: string) => {
      out.push(s);
      setLines([...out]);
    };

    log(`Build: ${BUILD}`);
    log(`Cloud configured: ${isCloudConfigured ? 'yes' : 'NO — running in local mode'}`);
    if (!supabase) {
      setRunning(false);
      return;
    }

    try {
      const { data: sess } = await supabase.auth.getSession();
      log(`Signed in: ${sess.session ? sess.session.user.email ?? 'yes' : 'NO'}`);
      if (!sess.session) {
        setRunning(false);
        return;
      }

      const { data: famId, error: famErr } = await supabase.rpc('get_or_create_family');
      if (famErr) {
        log(`FAMILY FAILED: ${famErr.code ?? ''} ${famErr.message}`);
        setRunning(false);
        return;
      }
      log(`Family id: ${String(famId).slice(0, 8)}…`);

      const id = makeId('place');
      log(`Test id: ${id.slice(0, 13)}… ${/^[0-9a-f-]{36}$/.test(id) ? '(valid uuid ✓)' : '(NOT a uuid ✗ — old build!)'}`);

      const { error: insErr } = await supabase.from('places').insert({
        id,
        family_id: famId,
        name: 'SYNC TEST',
        emoji: '🧪',
        gradient: 'woods',
        status: 'not_yet',
        tags: [],
        notes: [],
      });
      if (insErr) {
        log(`WRITE FAILED: [${insErr.code ?? '?'}] ${insErr.message}`);
        if (insErr.details) log(`details: ${insErr.details}`);
        if (insErr.hint) log(`hint: ${insErr.hint}`);
        setRunning(false);
        return;
      }
      log('Write ✓');

      const { data: rows, error: selErr } = await supabase.from('places').select('id').eq('id', id);
      log(selErr ? `READ FAILED: ${selErr.message}` : `Read back: ${rows?.length ?? 0} row(s) ${rows?.length ? '✓' : '✗'}`);

      const { error: delErr } = await supabase.from('places').delete().eq('id', id);
      log(delErr ? `Cleanup failed: ${delErr.message}` : 'Cleanup ✓');
      log('');
      log('RESULT: saving works — your journal will persist. 🎉');
    } catch (e) {
      log(`UNEXPECTED: ${e instanceof Error ? e.message : String(e)}`);
    }
    setRunning(false);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.surface }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.back, { backgroundColor: c.card, borderColor: c.line }]}>
          <Text style={{ fontSize: 20, color: c.ink, marginTop: -2 }}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { color: c.ink }]}>Sync check</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={{ paddingHorizontal: space.lg }}>
        <Text style={[styles.blurb, { color: c.inkSoft }]}>
          Runs a test save against your family journal and shows exactly what the database says. Nothing is kept — the
          test row deletes itself.
        </Text>
        <Pressable onPress={run} disabled={running} style={[styles.cta, { backgroundColor: c.primary, opacity: running ? 0.6 : 1 }]}>
          <Text style={[styles.ctaText, { color: c.onPrimary }]}>{running ? 'Checking…' : 'Run sync check'}</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.lg }}>
        <View style={[styles.console, { backgroundColor: c.card, borderColor: c.line }]}>
          {lines.length === 0 ? (
            <Text style={[styles.line, { color: c.inkFaint }]}>Results will appear here (Build {BUILD})</Text>
          ) : (
            lines.map((l, i) => (
              <Text key={i} style={[styles.line, { color: l.includes('FAILED') || l.includes('✗') ? c.clay : c.ink }]}>
                {l || ' '}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingVertical: space.md },
  back: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', fontFamily: fontRounded },
  blurb: { fontSize: 13.5, lineHeight: 19 },
  cta: { marginTop: space.md, borderRadius: 14, padding: 14, alignItems: 'center' },
  ctaText: { fontSize: 14.5, fontWeight: '800', fontFamily: fontRounded },
  console: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  line: { fontSize: 12.5, fontFamily: 'Menlo', lineHeight: 19 },
});
