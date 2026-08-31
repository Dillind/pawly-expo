import AppText from '@/components/core/app-text';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  children: string;
  /** A control belonging to the section, sitting at the end of the label row. */
  action?: ReactNode;
};

/**
 * The quiet label above a card. It is secondary ink on purpose: it names what
 * follows, and the card below it is the thing being read.
 */
const SectionLabel = ({ children, action }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.row}>
      <AppText size={13} fontWeight="bold" color="textSecondary">
        {children}
      </AppText>
      {action}
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.two,
      minHeight: 24
    }
  });

export default SectionLabel;
