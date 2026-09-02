import { BottomTabInset, ScreenGutter, Spacing, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

type Props = {
  children: ReactNode;
};

/**
 * The pinned action bar at the foot of a screen. A step's primary action must
 * not scroll away, because a member cannot see whether the form continues below
 * the button. The hairline is what stops it reading as the end of the content.
 *
 * KeyboardStickyView, so the bar rides above the keyboard rather than hiding
 * under it -- KeyboardProvider is already at the root.
 */
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
