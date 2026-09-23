import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  Keyframe,
  LinearTransition,
  ReduceMotion
} from 'react-native-reanimated';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Curve, Duration } from '@/constants/motion';
import { IconSize, Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatScheduledTime, formatTimeOfDay } from '@/lib/dates';
import type { FeedingScheduleLabel, Occurrence } from '@/types/core';

type Props = {
  occurrence: Occurrence;
  timezone: string;
  fedBy: string;
  isLogging?: boolean;
  isNested?: boolean;
  onOpenLog?: () => void;
  onLog?: () => void;
};

const labelText: Record<FeedingScheduleLabel, string> = {
  morning: 'Morning',
  lunch: 'Lunch',
  dinner: 'Dinner',
  custom: 'Feed'
};

const SlotReflow = LinearTransition.duration(Duration.reflow).reduceMotion(ReduceMotion.System);

// Not ZoomIn: it starts at scale 0, and nothing appears from nothing.
const TickIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }] },
  45: {
    opacity: 1,
    transform: [{ scale: 1.08 }],
    easing: Curve.overshoot
  },
  75: { opacity: 1, transform: [{ scale: 0.98 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] }
})
  .duration(Duration.quick)
  // Overlapping the two crossfades them in one spot and reads as a smear.
  .delay(Duration.exit)
  .reduceMotion(ReduceMotion.System);

// Scales down as it fades, so the chip leaves rather than dims.
const SlotOut = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 0.9 }] }
})
  .duration(Duration.exit)
  .reduceMotion(ReduceMotion.System);
const DetailIn = FadeIn.duration(Duration.quick).reduceMotion(ReduceMotion.System);

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

  // "Not logged", never "Missed", and never red: the app knows only whether
  // anyone tapped Log. See CONTEXT.md.
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
          <AppText size="callout">{labelText[occurrence.label]}</AppText>
          <AppText size="callout" color="textSecondary">
            {formatScheduledTime(occurrence.localTime)}
          </AppText>
        </View>

        {detail ? (
          <Animated.View key={occurrence.state} entering={DetailIn}>
            <AppText size="footnote" color="textSecondary" numberOfLines={2}>
              {detail}
            </AppText>
          </Animated.View>
        ) : null}
      </Animated.View>

      <Animated.View style={styles.slot} layout={SlotReflow}>
        {isFed ? (
          <Animated.View entering={TickIn}>
            <Icon name="check" size={IconSize.action} color="success" />
          </Animated.View>
        ) : onLog ? (
          <Animated.View exiting={SlotOut}>
            <MainButton
              text="Log"
              size="xs"
              // MainButton stretches by default. This is a chip, not a bar.
              containerStyle={styles.logButton}
              isLoading={isLogging}
              isDisabled={isLogging}
              onPress={onLog}
            />
          </Animated.View>
        ) : occurrence.state === 'upcoming' ? (
          <AppText size="footnote" color="textSecondary">
            Upcoming
          </AppText>
        ) : null}
      </Animated.View>
    </>
  );

  const rowStyle = [styles.row, isNested && styles.nested];

  // Only a logged row is tappable as a whole: a row that is both tappable and
  // holds a button is an ambiguous target.
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
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    nested: {
      paddingHorizontal: 0,
      paddingVertical: spacing.two,
      borderRadius: 0,
      backgroundColor: 'transparent'
    },
    text: {
      flex: 1,
      gap: 2
    },
    slot: {
      alignSelf: 'center'
    },
    logButton: {
      alignSelf: 'center'
    },
    heading: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.two
    }
  });

export default OccurrenceRow;
