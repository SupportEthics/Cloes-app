import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '@/data/store';
import { useTheme } from '@/theme';

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
          <StoreProvider>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.surface } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="place/[id]" />
            </Stack>
          </StoreProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
