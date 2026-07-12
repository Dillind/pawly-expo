import type { ThemeColors } from '@/constants/theme';
import { Platform, type ViewStyle } from 'react-native';

type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOpacity' | 'shadowRadius' | 'shadowOffset' | 'elevation'
>;

/** Small and subtle elevation */
export function createShadowSmall(theme: ThemeColors): ShadowStyle {
  return (
    Platform.select({
      ios: {
        shadowColor: theme.textSecondary,
        shadowOpacity: 0.2,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 3 }
      },
      android: {
        elevation: 2
      }
    }) ?? {}
  );
}

/** Cards and buttons */
export function createShadowMedium(theme: ThemeColors): ShadowStyle {
  return (
    Platform.select({
      ios: {
        shadowColor: theme.textSecondary,
        shadowOpacity: 0.2,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 6 }
      },
      android: {
        elevation: 4
      }
    }) ?? {}
  );
}

/** Modals and overlays */
export function createShadowLarge(theme: ThemeColors): ShadowStyle {
  return (
    Platform.select({
      ios: {
        shadowColor: theme.textSecondary,
        shadowOpacity: 0.2,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 9 }
      },
      android: {
        elevation: 8
      }
    }) ?? {}
  );
}
