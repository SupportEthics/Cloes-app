import { Platform, useColorScheme } from 'react-native';

/**
 * Trove design tokens — the same warm, outdoorsy palette as the clickable
 * prototype: deep pine primary, sunset-coral warmth, sky/amber/clay for
 * status verdicts, on a warm-paper neutral. Light + dark are both first-class.
 */

export type Palette = {
  surface: string;
  card: string;
  card2: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  line: string;
  primary: string;
  primaryTint: string;
  onPrimary: string;
  coral: string;
  coralTint: string;
  amber: string;
  amberTint: string;
  sky: string;
  skyTint: string;
  clay: string;
  clayTint: string;
  star: string;
};

export const lightPalette: Palette = {
  surface: '#FBF8F2',
  card: '#FFFFFF',
  card2: '#F6F1E8',
  ink: '#22312B',
  inkSoft: '#5D6B62',
  inkFaint: '#8A968D',
  line: '#ECE4D6',
  primary: '#1F5A4C',
  primaryTint: '#E2EEE7',
  onPrimary: '#FFFFFF',
  coral: '#FF6B4A',
  coralTint: '#FFE7DF',
  amber: '#C87F12',
  amberTint: '#FBEDCF',
  sky: '#2F86BE',
  skyTint: '#DEECF6',
  clay: '#C0563B',
  clayTint: '#F6E1D9',
  star: '#E0940F',
};

export const darkPalette: Palette = {
  surface: '#141F1B',
  card: '#1C2822',
  card2: '#22302A',
  ink: '#F1ECE0',
  inkSoft: '#A7B5AB',
  inkFaint: '#76857B',
  line: '#293831',
  primary: '#57C7A2',
  primaryTint: '#1D352C',
  onPrimary: '#0E2A22',
  coral: '#FF7E60',
  coralTint: '#3A231C',
  amber: '#F0AE3B',
  amberTint: '#3A2E14',
  sky: '#5AA9DA',
  skyTint: '#16303F',
  clay: '#E08163',
  clayTint: '#3A231B',
  star: '#F5B942',
};

export const radius = { sm: 12, md: 18, lg: 26, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Rounded, friendly display face on iOS; graceful system fallback elsewhere. */
export const fontRounded = Platform.select({ ios: 'ui-rounded', default: undefined });

/** Two-stop gradients used for the "photo" tiles (works with no image assets). */
export type GradientKey = 'woods' | 'beach' | 'farm' | 'castle' | 'soft' | 'museum' | 'park';

export const gradients: Record<GradientKey, readonly [string, string]> = {
  woods: ['#2E6B4E', '#8DBE77'],
  beach: ['#48B4C4', '#F4D384'],
  farm: ['#E79B45', '#A7C24E'],
  castle: ['#7C6BA0', '#C6A05B'],
  soft: ['#FF7EA9', '#79C4F5'],
  museum: ['#556FB0', '#C98FB0'],
  park: ['#3FA79C', '#9BCF77'],
};

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { c: isDark ? darkPalette : lightPalette, isDark };
}
