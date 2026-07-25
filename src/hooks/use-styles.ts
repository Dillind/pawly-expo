import { useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import type { AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Memoises a `makeStyles` factory against the active theme.
 *
 * `makeStyles` is the cache key, so it must be stable: define it at module
 * scope, or wrap it in `useCallback` when it closes over props (see
 * `text-input-validated.tsx`). An inline arrow recomputes every render —
 * still correct, just not memoised.
 */
export function useStyles<T extends NamedStyles<T>>(makeStyles: (theme: AppTheme) => T): T {
  const theme = useTheme();

  return useMemo(() => StyleSheet.create(makeStyles(theme)), [makeStyles, theme]);
}
