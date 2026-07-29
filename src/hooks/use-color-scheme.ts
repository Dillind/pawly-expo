import { useColorScheme as useSystemColorScheme } from 'react-native';

import type { ThemeMode } from '@/constants/theme';
import { useThemeStore } from '@/stores/theme-store';

/**
 * The single choke point every themed thing in the app already reads through:
 * `useTheme`, `useStyles` and every `makeStyles` factory. Resolving the stored
 * preference here is what makes the setting apply app-wide with no other change.
 */
export const useColorScheme = (): ThemeMode => {
  const systemScheme = useSystemColorScheme();
  const { preference } = useThemeStore();

  if (preference !== 'system') return preference;

  return systemScheme === 'dark' ? 'dark' : 'light';
};
