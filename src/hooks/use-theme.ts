/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useMemo } from 'react';

import { Colors, Spacing, type AppTheme, type ThemeMode } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme(): AppTheme {
  const scheme = useColorScheme();
  const mode: ThemeMode = scheme === 'unspecified' ? 'light' : scheme;

  return useMemo(
    () => ({
      colors: Colors[mode],
      isDark: mode === 'dark',
      spacing: Spacing
    }),
    [mode]
  );
}
