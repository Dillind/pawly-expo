import type { DependencyList } from 'react';

import type { ThemeColors } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type NamedStyles<T> = { [P in keyof T]: import('react-native').ViewStyle | import('react-native').TextStyle | import('react-native').ImageStyle };

/**
 * @deprecated Prefer `useStyles(makeStyles)` with a module-level `makeStyles` factory.
 * See docs/THEMING.md.
 */
export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (colors: ThemeColors) => T,
  deps: DependencyList = []
): T {
  return useStyles((theme) => factory(theme.colors), deps);
}
