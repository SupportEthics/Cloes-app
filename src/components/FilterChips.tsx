import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { fontRounded, space, useTheme } from '@/theme';

export type ChipOption = { key: string; label: string };

export function FilterChips({
  options,
  active,
  onChange,
}: {
  options: ChipOption[];
  /** A single key, or an array of keys for multi-select rows. */
  active: string | string[];
  onChange: (key: string) => void;
}) {
  const { c } = useTheme();
  const isOn = (key: string) => (Array.isArray(active) ? active.includes(key) : active === key);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Never let a flexible sibling (e.g. a results list) squash the chip row.
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={styles.row}
    >
      {options.map((opt) => {
        const on = isOn(opt.key);
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[
              styles.chip,
              { backgroundColor: on ? c.primary : c.card, borderColor: on ? c.primary : c.line },
            ]}
          >
            <Text style={[styles.label, { color: on ? c.onPrimary : c.inkSoft }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  label: { fontSize: 13, fontWeight: '700', fontFamily: fontRounded },
});
