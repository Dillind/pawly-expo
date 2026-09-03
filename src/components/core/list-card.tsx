import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { createShadowMedium } from '@/lib/styles/shadows';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * The white card a run of rows sits in. It carries no padding, because a row
 * inside it runs edge to edge and owns its own -- `SectionCard` is the padded
 * one, for a card holding prose rather than rows.
 */
const ListCard = ({ children, style }: Props) => {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return <View style={[styles.card, createShadowMedium(theme.colors), style]}>{children}</View>;
};

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    card: {
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement,
      overflow: 'hidden'
    }
  });

export default ListCard;
