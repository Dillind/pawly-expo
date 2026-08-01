import type { AppTheme } from '@/constants/theme';
import { Radius } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { createShadowSmall } from '@/lib/styles/shadows';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/** The white surface each pet-screen section sits on, over the tinted page. */
const SectionCard = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return <View style={[styles.card, createShadowSmall(theme.colors)]}>{children}</View>;
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    card: {
      padding: spacing.three,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    }
  });

export default SectionCard;
