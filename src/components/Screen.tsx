import React from 'react';
import { ScrollView, View } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { space, useTheme } from '@/theme';

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
}: {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
}) {
  const { c } = useTheme();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.surface }}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 140 }}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: space.lg }}>{children}</View>
      )}
    </SafeAreaView>
  );
}
