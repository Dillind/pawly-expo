import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
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
  /** Inside a card already. Drops its own fill so the two do not stack. */
  isNested?: boolean;
  onPress?: () => void;
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

const SlotRow = ({ slot, timezone, fedBy, isNested = false, onPress }: Props) => {
  const styles = useStyles(makeStyles);
  const rowStyle = [styles.row, isNested && styles.nested];

  const detail =
    slot.state === 'fed' && slot.satisfiedAt
      ? `${fedBy}, ${formatTimeOfDay(slot.satisfiedAt, timezone)}`
      : // "Not logged", never "Missed" -- CONTEXT.md, Not Logged.
        { fed: 'Fed', due: 'Due now', missed: 'Not logged', upcoming: 'Upcoming' }[slot.state];

  const body = (
    <>
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
    </>
  );

  // `upcoming` has no onPress: its Scheduled Time is in the future and RLS
  // rejects a logged_at later than now(), so a tap could write nothing.
  if (!onPress) return <View style={rowStyle}>{body}</View>;

  return (
    <PressableOpacity style={rowStyle} accessibilityRole="button" onPress={onPress}>
      {body}
    </PressableOpacity>
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
    nested: {
      paddingHorizontal: 0,
      paddingVertical: spacing.two,
      borderRadius: 0,
      backgroundColor: 'transparent'
    },
    label: {
      minWidth: 72
    },
    detail: {
      flex: 1
    }
  });

export default SlotRow;
