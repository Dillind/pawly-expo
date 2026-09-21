import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Keyframe,
  LinearTransition,
  ReduceMotion
} from 'react-native-reanimated';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Curve, Duration } from '@/constants/motion';
import { REMINDER_KIND_ICON } from '@/constants/options';
import { IconSize, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { ReminderOccurrence } from '@/types/core';

type Props = {
  reminder: ReminderOccurrence;
  // The occurrence's date, for a row that is not today's.
  dateLabel?: string;
  isTicking?: boolean;
  onTick?: () => void;
};

// The Kind's colour, on trial. See DECISIONS.md.
const KIND_COLOUR = {
  feed: 'text',
  medication: 'medication',
  vet: 'vet'
} as const;

// The same motion as occurrence-row.tsx. Change both or neither.
const RowReflow = LinearTransition.duration(Duration.reflow).reduceMotion(ReduceMotion.System);

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
  .delay(Duration.exit)
  .reduceMotion(ReduceMotion.System);

const ChipOut = FadeOut.duration(Duration.exit).reduceMotion(ReduceMotion.System);
const LabelIn = FadeIn.duration(Duration.quick).reduceMotion(ReduceMotion.System);

const ReminderRow = ({ reminder, dateLabel, isTicking = false, onTick }: Props) => {
  const styles = useStyles(makeStyles);
  const isDone = reminder.state === 'done';

  const body = (
    <>
      <Icon name={REMINDER_KIND_ICON[reminder.kind]} size={19} color={KIND_COLOUR[reminder.kind]} />

      <Animated.View style={styles.text} layout={RowReflow}>
        <AppText size={15} numberOfLines={1}>
          {reminder.title}
        </AppText>
        {dateLabel && (
          <AppText size={13} color="textSecondary">
            {dateLabel}
          </AppText>
        )}
      </Animated.View>

      <Animated.View style={styles.slot} layout={RowReflow}>
        {isDone ? (
          <Animated.View entering={TickIn}>
            <Icon name="check" size={IconSize.action} color="success" />
          </Animated.View>
        ) : (
          <>
            {/* Not yet its day. The word is a state, never a control. */}
            {reminder.state === 'future' && (
              <Animated.View style={styles.future} entering={LabelIn}>
                <AppText size={9} fontWeight="bold" color="textSecondary" style={styles.futureText}>
                  Future
                </AppText>
              </Animated.View>
            )}

            {onTick && (
              <Animated.View exiting={ChipOut}>
                <MainButton
                  text="Done"
                  size="xs"
                  containerStyle={styles.doneButton}
                  isLoading={isTicking}
                  isDisabled={isTicking}
                  onPress={onTick}
                />
              </Animated.View>
            )}
          </>
        )}
      </Animated.View>
    </>
  );

  // A done row is tappable as a whole, which is the only way back: there is no
  // chip left to press.
  if (isDone && onTick) {
    return (
      <PressableOpacity
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={`Put ${reminder.title} back`}
        onPress={onTick}>
        {body}
      </PressableOpacity>
    );
  }

  return <View style={styles.row}>{body}</View>;
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.two
    },
    text: {
      flex: 1,
      gap: 1
    },
    slot: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    doneButton: {
      alignSelf: 'center'
    },
    future: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 100,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.ghostBorder
    },
    futureText: {
      letterSpacing: 0.7,
      textTransform: 'uppercase'
    }
  });

export default ReminderRow;
