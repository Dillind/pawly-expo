import AppText from '@/components/core/app-text';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatDayHeading } from '@/lib/dates';
import { StyleSheet, View } from 'react-native';

type Props = {
  day: string;
  timezone: string;
};

/**
 * The "Fed 2 of 3" count this used to carry read as the whole household's, but
 * came from one pet's occurrences. Rather than sum a per-pet query the list cannot
 * call once per pet, the count is gone until Activity itself is reworked.
 */
const ActivityDayHeader = ({ day, timezone }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.header}>
      <AppText size={16} fontWeight="bold">
        {formatDayHeading(day, timezone)}
      </AppText>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.four,
      paddingBottom: spacing.two
    }
  });

export default ActivityDayHeader;
