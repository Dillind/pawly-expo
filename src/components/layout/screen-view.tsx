import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
};

/**
 * The frame every tab screen sits in: safe area, background, gutters.
 *
 * Only the top edge is claimed -- the native tab bar owns the bottom inset, so
 * adding 'bottom' here would double it. Left/right are irrelevant until the app
 * supports landscape.
 *
 * Horizontal padding lives here, but vertical padding does not: a scrolling
 * child needs its bottom padding on `contentContainerStyle` so content scrolls
 * past the tab bar rather than being clipped short of it.
 */
const ScreenView = ({ children }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {children}
    </SafeAreaView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.four
    }
  });

export default ScreenView;
