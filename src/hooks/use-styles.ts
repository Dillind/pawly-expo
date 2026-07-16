import { useMemo, type DependencyList } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import type { AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Memoises a module-level `makeStyles` factory against the active theme.
 * Recomputes when the colour scheme changes or when optional `deps` change.
 */
export function useStyles<T extends NamedStyles<T>>(
  makeStyles: (theme: AppTheme) => T,
  deps: DependencyList = []
): T {
  const theme = useTheme();

  return useMemo(
    () => StyleSheet.create(makeStyles(theme)),
    [theme.isDark, theme.colors, ...deps]
  );
}
