import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

const TRACK = 6;

const PackProgress = ({ itemCount, tickedCount }: { itemCount: number; tickedCount: number }) => {
  const styles = useStyles(makeStyles);
  const ratio = itemCount === 0 ? 0 : tickedCount / itemCount;
  const remaining = itemCount - tickedCount;

  return (
    <View style={styles.stack}>
      <View style={styles.labels}>
        <AppText size="footnote" color="textSecondary">
          {tickedCount} of {itemCount} packed
        </AppText>
        <AppText size="footnote" color="textSecondary">
          {remaining === 0 ? 'All packed' : `${remaining} to go`}
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
      </View>
    </View>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    stack: {
      gap: spacing.two
    },
    labels: {
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    track: {
      height: TRACK,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundSelected,
      overflow: 'hidden'
    },
    fill: {
      height: '100%',
      borderRadius: Radius.full,
      backgroundColor: colors.primary
    }
  });

export default PackProgress;
