import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/data/auth';
import { fontRounded, space, useTheme } from '@/theme';

/** Shown only in cloud mode when signed out. Email + password — works everywhere. */
export function SignIn() {
  const { c } = useTheme();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (mode === 'up' && !name.trim()) {
      setError('Add your name so the app can greet you.');
      return;
    }
    if (!email.trim() || password.length < 6) {
      setError('Enter an email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    const res = mode === 'in' ? await signIn(email, password) : await signUp(email, password, name);
    setBusy(false);
    if (res.error) setError(res.error);
    else if (res.needsConfirmation) setNotice('Almost there — check your email to confirm, then sign in.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <LinearGradient colors={['#2E6B4E', '#8FBF7E']} style={styles.logo}>
          <Text style={styles.logoText}>🧭</Text>
        </LinearGradient>
        <Text style={[styles.title, { color: c.ink }]}>Trove</Text>
        <Text style={[styles.tag, { color: c.inkSoft }]}>Your family's adventure book</Text>

        <View style={styles.form}>
          {mode === 'up' ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={c.inkFaint}
              autoCapitalize="words"
              autoComplete="name"
              style={[styles.input, { backgroundColor: c.card, borderColor: c.line, color: c.ink }]}
            />
          ) : null}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={c.inkFaint}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={[styles.input, { backgroundColor: c.card, borderColor: c.line, color: c.ink }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={c.inkFaint}
            secureTextEntry
            style={[styles.input, { backgroundColor: c.card, borderColor: c.line, color: c.ink }]}
          />

          {error ? <Text style={[styles.msg, { color: c.clay }]}>{error}</Text> : null}
          {notice ? <Text style={[styles.msg, { color: c.primary }]}>{notice}</Text> : null}

          <Pressable onPress={submit} disabled={busy} style={[styles.cta, { backgroundColor: c.primary, opacity: busy ? 0.6 : 1 }]}>
            {busy ? (
              <ActivityIndicator color={c.onPrimary} />
            ) : (
              <Text style={[styles.ctaText, { color: c.onPrimary }]}>{mode === 'in' ? 'Sign in' : 'Create account'}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(null); setNotice(null); }} style={styles.switch}>
            <Text style={[styles.switchText, { color: c.inkSoft }]}>
              {mode === 'in' ? "New here? " : 'Already have an account? '}
              <Text style={{ color: c.primary, fontWeight: '800' }}>{mode === 'in' ? 'Create an account' : 'Sign in'}</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  logo: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 38 },
  title: { fontSize: 30, fontWeight: '800', marginTop: 16, fontFamily: fontRounded },
  tag: { fontSize: 14, marginTop: 4 },
  form: { width: '100%', maxWidth: 380, marginTop: 30, gap: 12 },
  input: { borderWidth: 1, borderRadius: 14, padding: 15, fontSize: 15 },
  msg: { fontSize: 13, lineHeight: 18, paddingHorizontal: 4 },
  cta: { borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 4 },
  ctaText: { fontSize: 15.5, fontWeight: '800', fontFamily: fontRounded },
  switch: { alignItems: 'center', marginTop: 8, padding: 8 },
  switchText: { fontSize: 13.5 },
});
