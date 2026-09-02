import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import type { AppTheme } from '@/constants/theme';
import { useUserStats } from '@/hooks/queries/account/use-user-stats';
import { useStyles } from '@/hooks/use-styles';
import { formatCount } from '@/lib/numbers';

const Stat = ({ value, label }: { value: number | undefined; label: string }) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.stat}>
      <AppText variant="header" size={20} align="center" style={styles.value}>
        {value === undefined ? '–' : formatCount(value)}
      </AppText>
      <AppText size={13} color="textSecondary" align="center">
        {label}
      </AppText>
    </View>
  );
};

const ProfileStats = () => {
  const styles = useStyles(makeStyles);
  const { data: stats } = useUserStats();

  return (
    <View style={styles.row}>
      <Stat value={stats?.feedsLogged} label="Feeds logged" />
      <View style={styles.divider} />
      <Stat value={stats?.postsCreated} label="Posts created" />
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    stat: {
      flex: 1,
      gap: spacing.half
    },
    // Tabular figures: the two columns are the same width, so proportional
    // digits leave the numbers sitting off their own centres.
    value: {
      fontVariant: ['tabular-nums']
    },
    divider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: 'stretch',
      backgroundColor: colors.border
    }
  });

export default ProfileStats;
