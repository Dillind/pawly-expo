import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import type { IconName } from '@/constants/icon-map';
import type { AppTheme, ThemeColor } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatScheduledTime, formatTimeOfDay } from '@/lib/dates';
import type { FeedingScheduleLabel, SlotState } from '@/types/core';
import { StyleSheet, View } from 'react-native';

type Props = {
  slot: SlotState;
  timezone: string;
  fedBy: string;
};

const slotLabelText: Record<FeedingScheduleLabel, string> = {
  morning: 'Morning',
  lunch: 'Lunch',
  dinner: 'Dinner',
  custom: 'Feed'
};

const stateIcon: Record<SlotState['state'], IconName> = {
  fed: 'check',
  due: 'dot',
  missed: 'circleAlert',
  upcoming: 'dot'
};

const stateColour: Record<SlotState['state'], ThemeColor> = {
  fed: 'primary',
  due: 'accent',
  missed: 'error',
  upcoming: 'textSecondary'
};

const SlotRow = ({ slot, timezone, fedBy }: Props) => {
  const styles = useStyles(makeStyles);

  const detail =
    slot.state === 'fed' && slot.satisfiedAt
      ? `${fedBy}, ${formatTimeOfDay(slot.satisfiedAt, timezone)}`
      : { fed: 'Fed', due: 'Due now', missed: 'Missed', upcoming: 'Upcoming' }[slot.state];

  return (
    <View style={styles.row}>
      <Icon name={stateIcon[slot.state]} size={18} color={stateColour[slot.state]} />
      <AppText size={16} style={styles.label}>
        {slotLabelText[slot.label]}
      </AppText>
      <AppText size={14} color="textSecondary">
        {formatScheduledTime(slot.scheduledTime)}
      </AppText>
      <AppText size={14} color={stateColour[slot.state]} style={styles.detail} align="right">
        {detail}
      </AppText>
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.three,
      paddingHorizontal: spacing.three,
      borderRadius: 12,
      backgroundColor: colors.backgroundElement
    },
    label: {
      minWidth: 72
    },
    detail: {
      flex: 1
    }
  });

export default SlotRow;
