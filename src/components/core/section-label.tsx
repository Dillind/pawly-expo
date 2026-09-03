import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  children: string;
  /** A control belonging to the section, sitting at the end of the label row. */
  action?: ReactNode;
  /**
   * A heading rather than a label -- full ink, heading face, section-title
   * size. For a section that is the reader's destination rather than a name
   * over the card they are already reading.
   */
  isHeading?: boolean;
};

/**
 * The quiet label above a card. It is secondary ink on purpose: it names what
 * follows, and the card below it is the thing being read.
 */
const SectionLabel = ({ children, action, isHeading = false }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.row}>
      <AppText
        variant={isHeading ? 'header' : 'body'}
        size={isHeading ? 17 : 13}
        fontWeight="bold"
        color={isHeading ? 'text' : 'textSecondary'}>
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
