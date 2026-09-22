import { useMemo } from 'react';

import { COLORS, Spacing, type AppTheme, type ThemeMode } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme(): AppTheme {
  const mode: ThemeMode = useColorScheme();

  return useMemo(
    () => ({
      colors: COLORS[mode],
      isDark: mode === 'dark',
      spacing: Spacing
    }),
    [mode]
  );
}
