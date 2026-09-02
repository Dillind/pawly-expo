import { Platform, type ViewStyle } from 'react-native';

import type { ThemeColors } from '@/constants/theme';

type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOpacity' | 'shadowRadius' | 'shadowOffset' | 'elevation'
>;

type Elevation = { radius: number; opacity: number; offsetY: number; elevation: number };

// Always a dark colour, never a theme foreground: textSecondary drew a light
// halo in dark mode instead of a shadow.
const createShadow = (theme: ThemeColors, { radius, opacity, offsetY, elevation }: Elevation) =>
  Platform.select<ShadowStyle>({
    ios: {
      shadowColor: theme.shadow,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: offsetY }
    },
    android: { elevation }
  }) ?? {};

export function createShadowSmall(theme: ThemeColors): ShadowStyle {
  return createShadow(theme, { radius: 6, opacity: 0.05, offsetY: 2, elevation: 2 });
}

export function createShadowMedium(theme: ThemeColors): ShadowStyle {
  return createShadow(theme, { radius: 16, opacity: 0.07, offsetY: 6, elevation: 4 });
}

export function createShadowLarge(theme: ThemeColors): ShadowStyle {
  return createShadow(theme, { radius: 32, opacity: 0.11, offsetY: 14, elevation: 8 });
}
