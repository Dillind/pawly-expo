import AppText from '@/components/core/app-text';
import type { AppTheme } from '@/constants/theme';
import { useSlotStates } from '@/hooks/queries/use-slot-states';
import { useStyles } from '@/hooks/use-styles';
import { formatDayHeading } from '@/lib/dates';
import { StyleSheet, View } from 'react-native';

type Props = {
  day: string;
  petId: string | undefined;
  timezone: string;
};

/**
 * Missed Feeds are not rows in this list — they are a count on the day header,
 * which is what keeps pagination a cursor over one table instead of a merge of
 * two sources per day.
 */
const ActivityDayHeader = ({ day, petId, timezone }: Props) => {
  const styles = useStyles(makeStyles);
  const { data: slots } = useSlotStates(petId, day);

  const fedCount = slots?.filter((slot) => slot.state === 'fed').length ?? 0;
  const totalCount = slots?.length ?? 0;

  return (
    <View style={styles.header}>
      <AppText size={16} fontWeight="bold">
        {formatDayHeading(day, timezone)}
      </AppText>
      {totalCount > 0 && (
        <AppText size={14} color={fedCount < totalCount ? 'error' : 'textSecondary'}>
          Fed {fedCount} of {totalCount}
        </AppText>
      )}
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
