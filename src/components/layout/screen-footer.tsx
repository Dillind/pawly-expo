import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import { BottomTabInset, ScreenGutter, Spacing, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  children: ReactNode;
};

// A step's primary action must not scroll away, and the hairline stops the bar
// reading as the end of the content. KeyboardStickyView so it rides above the
// keyboard.
const ScreenFooter = ({ children }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: BottomTabInset - Spacing.three }}>
      <View style={styles.footer}>{children}</View>
    </KeyboardStickyView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    footer: {
      gap: spacing.two,
      paddingHorizontal: ScreenGutter,
      paddingTop: spacing.three,
      paddingBottom: BottomTabInset,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background
    }
  });

export default ScreenFooter;
