import { useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import type { AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

// `makeStyles` is the cache key, so it must be stable: define it at module scope,
// or wrap it in `useCallback` when it closes over props. An inline arrow is still
// correct, just not memoised.
export function useStyles<T extends NamedStyles<T>>(makeStyles: (theme: AppTheme) => T): T {
  const theme = useTheme();

  return useMemo(() => StyleSheet.create(makeStyles(theme)), [makeStyles, theme]);
}
