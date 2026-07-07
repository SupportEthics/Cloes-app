import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useTheme } from '@/theme';

/** Emoji tab icon; the label colour carries the active/inactive state. */
function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.inkFaint,
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.line,
          height: Platform.select({ ios: 88, default: 68 }),
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => <TabIcon emoji="🏠" /> }} />
      <Tabs.Screen name="list" options={{ title: 'List', tabBarIcon: () => <TabIcon emoji="🗺️" /> }} />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          // The raised coral "+" in the middle of the bar (matches the prototype).
          tabBarButton: (props) => (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start' }}>
              <Pressable
                onPress={props.onPress}
                accessibilityRole="button"
                accessibilityLabel="Add a place"
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 20,
                  marginTop: -18,
                  backgroundColor: c.coral,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: c.coral,
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 6,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 30, marginTop: -2 }}>＋</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="year" options={{ title: 'Year', tabBarIcon: () => <TabIcon emoji="📖" /> }} />
      <Tabs.Screen name="family" options={{ title: 'Family', tabBarIcon: () => <TabIcon emoji="🧒" /> }} />
    </Tabs>
  );
}
