import { useMemo, type DependencyList } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Builds a StyleSheet from the active theme. Recreates when the color scheme
 * changes, or when optional `deps` change (e.g. a theme-color prop override).
 */
export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (theme: ThemeColors) => T,
  deps: DependencyList = []
): T {
  const theme = useTheme();

  return useMemo(() => StyleSheet.create(factory(theme)), [theme, ...deps]);
}
