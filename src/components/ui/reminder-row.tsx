import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import type { IconName } from '@/constants/icon-map';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { ReminderKind, ReminderOccurrence } from '@/types/core';
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
  reminder: ReminderOccurrence;
  isTicking?: boolean;
  onTick?: () => void;
};

const KIND_ICON: Record<ReminderKind, IconName> = {
  feed: 'utensils',
  medication: 'pill',
  vet: 'stethoscope'
};

// The Kind's colour, on trial. See DECISIONS.md -- reverting means deleting
// this map and the four tokens it names.
const KIND_COLOUR = {
  feed: 'text',
  medication: 'medication',
  vet: 'vet'
} as const;

const ROW_MS = 220;
const EXIT_MS = 120;
const TICK_MS = 160;

// The same motion as a logged feed, because it is the same row.
const RowReflow = LinearTransition.duration(ROW_MS).reduceMotion(ReduceMotion.System);

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
  .delay(EXIT_MS)
  .reduceMotion(ReduceMotion.System);

const ChipOut = FadeOut.duration(EXIT_MS).reduceMotion(ReduceMotion.System);
const LabelIn = FadeIn.duration(160).reduceMotion(ReduceMotion.System);

const ReminderRow = ({ reminder, isTicking = false, onTick }: Props) => {
  const styles = useStyles(makeStyles);
  const isDone = reminder.state === 'done';

  return (
    <View style={styles.row}>
      <Icon name={KIND_ICON[reminder.kind]} size={19} color={KIND_COLOUR[reminder.kind]} />

      <Animated.View style={styles.text} layout={RowReflow}>
        <AppText size={15} numberOfLines={1}>
          {reminder.title}
        </AppText>
      </Animated.View>

      <Animated.View style={styles.slot} layout={RowReflow}>
        {isDone ? (
          <Animated.View entering={TickIn}>
            <Icon name="check" size={20} color="success" />
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
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.two
    },
    text: { flex: 1 },
    slot: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    doneButton: { alignSelf: 'center' },
    future: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 100,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.ghostBorder
    },
    futureText: { letterSpacing: 0.7, textTransform: 'uppercase' }
  });

export default ReminderRow;
