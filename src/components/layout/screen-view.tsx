import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  /**
   * Defaults to the top edge only. The native tab bar owns the bottom inset, so
   * claiming 'bottom' would double it, and left/right are irrelevant until the
   * app supports landscape.
   *
   * A screen presented with a native header passes `[]`: the header already sits
   * below the status bar, and claiming the top again indents the whole screen a
   * second time.
   */
  edges?: readonly Edge[];
};

/**
 * The frame a screen sits in: safe area and background. Nothing else.
 *
 * Gutters deliberately do not live here. Every screen in this app puts a
 * scroller directly inside, so padding on the frame would inset the scroll view
 * rather than its content -- see ScreenGutter in constants/theme.
 */
const ScreenView = ({ children, edges = ['top'] }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      {children}
    </SafeAreaView>
  );
};

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background
    }
  });

export default ScreenView;
