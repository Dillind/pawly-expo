import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatScheduledTime, formatTimeOfDay } from '@/lib/dates';
import type { FeedingScheduleLabel, Occurrence } from '@/types/core';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  LinearTransition,
  ReduceMotion
} from 'react-native-reanimated';

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

const SLOT_MS = 220;
const EXIT_MS = 120;
const TICK_MS = 160;

const SlotReflow = LinearTransition.duration(SLOT_MS).reduceMotion(ReduceMotion.System);

// Not ZoomIn: it starts at scale 0, and nothing appears from nothing.
const TickIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }] },
  55: {
    opacity: 1,
    transform: [{ scale: 1.06 }],
    easing: Easing.bezier(0.23, 1, 0.32, 1)
  },
  100: { opacity: 1, transform: [{ scale: 1 }] }
})
  .duration(TICK_MS)
  // Waits for the Log button to leave. Overlapping the two crossfades them in
  // the same spot, and the tick reads as a smear across the pill.
  .delay(EXIT_MS)
  .reduceMotion(ReduceMotion.System);

const SlotOut = FadeOut.duration(EXIT_MS).reduceMotion(ReduceMotion.System);
const DetailIn = FadeIn.duration(160).reduceMotion(ReduceMotion.System);

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
      <Animated.View style={styles.text} layout={SlotReflow}>
        <View style={styles.heading}>
          <AppText size={15}>{labelText[occurrence.label]}</AppText>
          <AppText size={15} color="textSecondary">
            {formatScheduledTime(occurrence.localTime)}
          </AppText>
        </View>

        {detail ? (
          <Animated.View key={occurrence.state} entering={DetailIn}>
            <AppText size={13} color="textSecondary" numberOfLines={2}>
              {detail}
            </AppText>
          </Animated.View>
        ) : null}
      </Animated.View>

      <Animated.View style={styles.slot} layout={SlotReflow}>
        {isFed ? (
          <Animated.View entering={TickIn}>
            <Icon name="check" size={20} color="success" />
          </Animated.View>
        ) : onLog ? (
          <Animated.View exiting={SlotOut}>
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
          </Animated.View>
        ) : (
          <AppText size={13} color="textSecondary">
            Upcoming
          </AppText>
        )}
      </Animated.View>
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
    slot: { alignSelf: 'center' },
    logButton: { alignSelf: 'center' },
    heading: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.two
    }
  });

export default OccurrenceRow;
