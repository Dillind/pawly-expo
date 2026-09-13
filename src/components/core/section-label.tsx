import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  children: string;
  action?: ReactNode;
  // For a section that is the reader's destination, not a name over the card
  // they are already reading.
  isHeading?: boolean;
};

// Secondary ink on purpose: the card below it is the thing being read.
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
