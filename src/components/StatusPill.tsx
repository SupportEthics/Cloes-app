import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { STATUS_META, type Status } from '@/data/types';
import { fontRounded, useTheme } from '@/theme';

export function StatusPill({ status, style }: { status: Status; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const meta = STATUS_META[status];
  return (
    <View style={[styles.pill, { backgroundColor: c[meta.bg] }, style]}>
      <Text style={[styles.text, { color: c[meta.fg] }]}>{meta.short}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '800', fontFamily: fontRounded },
});
