import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { IconName } from '@/constants/icon-map';
import type { AppTheme, ThemeColor } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatScheduledTime, formatTimeOfDay } from '@/lib/dates';
import type { FeedingScheduleLabel, Occurrence } from '@/types/core';
import { StyleSheet, View } from 'react-native';

type Props = {
  occurrence: Occurrence;
  timezone: string;
  fedBy: string;
  /** Inside a card already. Drops its own fill so the two do not stack. */
  isNested?: boolean;
  onPress?: () => void;
};

const labelText: Record<FeedingScheduleLabel, string> = {
  morning: 'Morning',
  lunch: 'Lunch',
  dinner: 'Dinner',
  custom: 'Feed'
};

const stateIcon: Record<Occurrence['state'], IconName> = {
  fed: 'check',
  due: 'dot',
  missed: 'circleAlert',
  upcoming: 'dot'
};

const stateColour: Record<Occurrence['state'], ThemeColor> = {
  fed: 'primary',
  due: 'accent',
  missed: 'error',
  upcoming: 'textSecondary'
};

const OccurrenceRow = ({ occurrence, timezone, fedBy, isNested = false, onPress }: Props) => {
  const styles = useStyles(makeStyles);
  const rowStyle = [styles.row, isNested && styles.nested];

  const detail =
    occurrence.state === 'fed' && occurrence.satisfiedAt
      ? `${fedBy}, ${formatTimeOfDay(occurrence.satisfiedAt, timezone)}`
      : // "Not logged", never "Missed" -- CONTEXT.md, Not Logged.
        { fed: 'Fed', due: 'Due now', missed: 'Not logged', upcoming: 'Upcoming' }[occurrence.state];

  const body = (
    <>
      <Icon name={stateIcon[occurrence.state]} size={18} color={stateColour[occurrence.state]} />
      <AppText size={16} style={styles.label}>
        {labelText[occurrence.label]}
      </AppText>
      <AppText size={14} color="textSecondary">
        {formatScheduledTime(occurrence.localTime)}
      </AppText>
      <AppText size={14} color={stateColour[occurrence.state]} style={styles.detail} align="right">
        {detail}
      </AppText>
    </>
  );

  // `upcoming` has no onPress: its Feed Time is in the future and RLS rejects a
  // logged_at later than now(), so a tap could write nothing.
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

export default OccurrenceRow;
