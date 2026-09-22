import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenGutter, Spacing, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  children: ReactNode;
};

// Keeps a step's primary action above the keyboard. The real bottom inset, not BottomTabInset:
// every caller is a full-screen modal with no tab bar.
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
