import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  children: ReactNode;
  // The native tab bar owns the bottom inset, so claiming it doubles it. A
  // screen with a native header passes `[]`, or the top is claimed twice.
  edges?: readonly Edge[];
};

// Gutters do not live here: every screen puts a scroller directly inside, so
// padding on the frame insets the scroll view rather than its content.
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
