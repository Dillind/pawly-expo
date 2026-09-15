import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenGutter, Spacing, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  children: ReactNode;
};

// A step's primary action must not scroll away, and the hairline stops the bar
// reading as the end of the content. KeyboardStickyView so it rides above the
// keyboard.
//
// The real bottom inset, not the tab bar constant: every caller is a
// full-screen modal, which has no tab bar to duck under.
const ScreenFooter = ({ children }: Props) => {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const paddingBottom = Math.max(insets.bottom, Spacing.three);

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: paddingBottom }}>
      <View style={[styles.footer, { paddingBottom }]}>{children}</View>
    </KeyboardStickyView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    footer: {
      gap: spacing.two,
      paddingHorizontal: ScreenGutter,
      paddingTop: spacing.three,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background
    }
  });

export default ScreenFooter;
