import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { fontRounded, space, useTheme, type Palette } from '@/theme';

export type ChipOption = {
  key: string;
  label: string;
  /** Optional palette colour (e.g. a verdict colour) — used when the chip is active. */
  color?: keyof Palette;
  /** Matching tint shown as the idle background so colour-coding reads at a glance. */
  tint?: keyof Palette;
};

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
        const activeBg = opt.color ? c[opt.color] : c.primary;
        const idleBg = opt.tint ? c[opt.tint] : c.card;
        const idleFg = opt.color ? c[opt.color] : c.inkSoft;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[
              styles.chip,
              {
                backgroundColor: on ? activeBg : idleBg,
                borderColor: on ? activeBg : opt.tint ? 'transparent' : c.line,
              },
            ]}
          >
            <Text style={[styles.label, { color: on ? (opt.color ? '#fff' : c.onPrimary) : idleFg }]}>
              {opt.label}
            </Text>
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
