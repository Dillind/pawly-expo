import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatScheduledTime, formatTimeOfDay } from '@/lib/dates';
import type { FeedingScheduleLabel, Occurrence } from '@/types/core';
import { StyleSheet, View } from 'react-native';

type Props = {
  occurrence: Occurrence;
  timezone: string;
  fedBy: string;
  isLogging?: boolean;
  /** Inside a card already. Drops its own fill so the two do not stack. */
  isNested?: boolean;
  /** Tapping a logged row opens it for correction. */
  onOpenLog?: () => void;
  onLog?: () => void;
};

const labelText: Record<FeedingScheduleLabel, string> = {
  morning: 'Morning',
  lunch: 'Lunch',
  dinner: 'Dinner',
  custom: 'Feed'
};

const OccurrenceRow = ({
  occurrence,
  timezone,
  fedBy,
  isLogging = false,
  isNested = false,
  onOpenLog,
  onLog
}: Props) => {
  const styles = useStyles(makeStyles);
  const isFed = occurrence.state === 'fed';

  // "Not logged", never "Missed" -- CONTEXT.md, Not Logged. And the row does not
  // shout: nothing here is red, because the app does not know whether the pet
  // ate, only whether anyone tapped Log.
  const detail = isFed
    ? occurrence.satisfiedAt
      ? `${fedBy}, ${formatTimeOfDay(occurrence.satisfiedAt, timezone)}`
      : fedBy
    : occurrence.state === 'missed'
      ? 'Not logged'
      : occurrence.instructions;

  const body = (
    <>
      <View style={styles.text}>
        <View style={styles.heading}>
          <AppText size={15}>{labelText[occurrence.label]}</AppText>
          <AppText size={15} color="textSecondary">
            {formatScheduledTime(occurrence.localTime)}
          </AppText>
        </View>

        {detail ? (
          <AppText size={13} color="textSecondary" numberOfLines={2}>
            {detail}
          </AppText>
        ) : null}
      </View>

      {isFed ? (
        <Icon name="check" size={20} color="primary" />
      ) : onLog ? (
        <MainButton
          text="Log"
          size="xs"
          // MainButton stretches by default, which in a row means it fills the
          // row's height. The Log button is a chip, not a bar.
          containerStyle={styles.logButton}
          isLoading={isLogging}
          isDisabled={isLogging}
          onPress={onLog}
        />
      ) : (
        <AppText size={13} color="textSecondary">
          Upcoming
        </AppText>
      )}
    </>
  );

  const rowStyle = [styles.row, isNested && styles.nested];

  // Only a logged row is tappable as a whole: it opens the log for correction.
  // An unlogged row's action is the Log button, and a row that is both tappable
  // and holds a button is the ambiguous target FeedLogRow already warns about.
  if (isFed && onOpenLog) {
    return (
      <PressableOpacity
        style={rowStyle}
        accessibilityRole="button"
        accessibilityLabel={`Edit the ${labelText[occurrence.label].toLowerCase()} log`}
        onPress={onOpenLog}>
        {body}
      </PressableOpacity>
    );
  }

  return <View style={rowStyle}>{body}</View>;
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
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    nested: {
      paddingHorizontal: 0,
      paddingVertical: spacing.two,
      borderRadius: 0,
      backgroundColor: 'transparent'
    },
    text: { flex: 1, gap: 2 },
    logButton: { alignSelf: 'center' },
    heading: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.two
    }
  });

export default OccurrenceRow;
