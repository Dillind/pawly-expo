import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  /** Left indent, for a rule that starts under a row's label rather than its icon. */
  inset?: number;
};

/**
 * The one horizontal rule. It carries no margin of its own -- spacing belongs
 * to the parent, so the same line can sit under a sheet header and above a
 * nested list without either fighting it.
 */
const Divider = ({ inset = 0 }: Props) => {
  const styles = useStyles(useCallback((theme: AppTheme) => makeStyles(theme, inset), [inset]));

  return <View style={styles.divider} />;
};

const makeStyles = ({ colors }: AppTheme, inset: number) =>
  StyleSheet.create({
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: inset
    }
  });

export default Divider;
