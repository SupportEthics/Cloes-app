import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SignIn } from '@/components/SignIn';
import { AuthProvider, useAuth } from '@/data/auth';
import { StoreProvider } from '@/data/store';
import { useTheme } from '@/theme';

function AppShell() {
  const { c } = useTheme();
  const { cloud, session, loading } = useAuth();

  // Cloud mode gate: show a spinner while restoring the session, then the
  // sign-in screen if signed out. In local mode this is skipped entirely.
  if (cloud && loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  if (cloud && !session) return <SignIn />;

  return (
    <StoreProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.surface } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="place/[id]" />
      </Stack>
    </StoreProvider>
  );
}

export default function RootLayout() {
  const { c, isDark } = useTheme();

  // Feed our warm palette into React Navigation so the tab bar / headers
  // (the navigation "chrome") follow the theme in both light and dark.
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: c.surface, card: c.surface, border: c.line, text: c.ink, primary: c.primary },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <AuthProvider>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <AppShell />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
