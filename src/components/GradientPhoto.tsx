import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, Text, ViewStyle } from 'react-native';
import { gradients, type GradientKey } from '@/theme';

/**
 * A "photo" tile built from a gradient + focal emoji. Lets the app look rich
 * with zero image assets; real photos (from the picker) render as <Image> and
 * fall back to this when a memory has no picture yet.
 */
export function GradientPhoto({
  gradient,
  emoji,
  fontSize = 40,
  radius = 0,
  height,
  style,
  children,
}: {
  gradient: GradientKey;
  emoji?: string;
  fontSize?: number;
  radius?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  return (
    <LinearGradient
      colors={gradients[gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ height, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      {emoji ? <Text style={{ fontSize }}>{emoji}</Text> : null}
      {children}
    </LinearGradient>
  );
}
