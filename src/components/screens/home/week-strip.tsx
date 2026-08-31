import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { dayOfMonth, shiftWeeks, weekOf, weekdayInitial } from '@/lib/dates';
import { hapticSelection } from '@/lib/haptics';
import type { ReminderKind } from '@/types/core';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const SLIDE_MS = 260;
const UNDERLINE_WIDTH = 18;

type Props = {
  /** The day in view. Not necessarily today. */
  selectedDay: string;
  /** Today in the household's timezone, so a past day can be told apart. */
  today: string;
  /** The Reminder kinds on each day, keyed by date. A day with none is absent. */
  reminderKinds?: Record<string, ReminderKind[]>;
  onSelectDay: (day: string) => void;
};

// The Kind's colour, on trial. See DECISIONS.md -- reverting to one gold dot
// means deleting this map and the four tokens it names.
const DOT_COLOUR = {
  feed: 'primary',
  medication: 'medication',
  vet: 'vet'
} as const;

/**
 * The week the selected day sits in, Monday to Sunday.
 *
 * This is the day header and the way to move between days, so it stands up on
 * its own. A day carrying a Reminder gets a 4px dot under the date, one per
 * kind. Feeds get none: a dot on all seven days says nothing.
 *
 * The underline is one shared value that slides across, not seven that fade.
 * Seven animations would cross-fade rather than travel, and travel is the thing
 * that says where you moved.
 *
 * Swiping the strip sideways moves a week. Without it the strip is a trap: it
 * only ever draws the selected day's week, so there would be no way to reach
 * another one. The gesture adds no chrome, so it does not pre-empt whatever the
 * month row's chevron becomes.
 */
const WeekStrip = ({ selectedDay, today, reminderKinds, onSelectDay }: Props) => {
  const styles = useStyles(makeStyles);
  const theme = useTheme();

  const days = weekOf(selectedDay);
  const selectedIndex = Math.max(0, days.indexOf(selectedDay));

  // The cells are equal flex children, so their width is only known once laid
  // out. The underline cannot be positioned off a guess.
  const [rowWidth, setRowWidth] = useState(0);
  const cellWidth = rowWidth > 0 ? (rowWidth - theme.spacing.one * 6) / 7 : 0;

  const underlineStyle = useAnimatedStyle(() => {
    const left =
      selectedIndex * (cellWidth + theme.spacing.one) + (cellWidth - UNDERLINE_WIDTH) / 2;

    return {
      opacity: cellWidth > 0 ? 1 : 0,
      transform: [{ translateX: withTiming(left, { duration: SLIDE_MS }) }]
    };
  });

  const onLayout = (event: LayoutChangeEvent) => setRowWidth(event.nativeEvent.layout.width);

  const goWeek = (weeks: number) => {
    void hapticSelection();
    onSelectDay(shiftWeeks(selectedDay, weeks));
  };

  // Fling rather than pan: a pan would fight the vertical scroll the strip sits
  // inside, and a week is a discrete step, not a draggable position.
  const swipe = Gesture.Race(
    Gesture.Fling()
      .direction(Directions.LEFT)
      .onEnd(() => runOnJS(goWeek)(1)),
    Gesture.Fling()
      .direction(Directions.RIGHT)
      .onEnd(() => runOnJS(goWeek)(-1))
  );

  return (
    <GestureDetector gesture={swipe}>
      <View style={styles.row} onLayout={onLayout}>
        {days.map((day) => {
          const isSelected = day === selectedDay;
          const isPast = day < today;

          return (
            <PressableOpacity
              key={day}
              style={[styles.cell, isSelected && styles.cellSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                if (isSelected) return;

                void hapticSelection();
                onSelectDay(day);
              }}>
              <AppText size={11} fontWeight="bold" color="textSecondary" style={styles.initial}>
                {weekdayInitial(day)}
              </AppText>
              <AppText
                variant="header"
                size={16}
                fontWeight="bold"
                color={isPast && !isSelected ? 'textSecondary' : 'text'}>
                {dayOfMonth(day)}
              </AppText>
              {/* Always rendered, empty or not. A slot that appears with the
                  first Reminder would resize every cell around it. */}
              <View style={styles.dotSlot}>
                {reminderKinds?.[day]?.map((kind) => (
                  <View
                    key={kind}
                    style={[styles.dot, { backgroundColor: theme.colors[DOT_COLOUR[kind]] }]}
                  />
                ))}
              </View>
            </PressableOpacity>
          );
        })}
        <Animated.View style={[styles.underline, underlineStyle]} pointerEvents="none" />
      </View>
    </GestureDetector>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: spacing.one,
      height: 58
    },
    cell: {
      flex: 1,
      borderRadius: Radius.tile,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.one - 1
    },
    cellSelected: {
      backgroundColor: colors.backgroundSelected
    },
    initial: {
      letterSpacing: 0.6
    },
    // The underline is absolutely positioned at the bottom of the row, and
    // without this margin it sits exactly on the dots -- so the selected day,
    // the one you are actually looking at, is the one that loses them.
    dotSlot: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      height: 4,
      marginBottom: 8
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 100
    },
    underline: {
      position: 'absolute',
      bottom: 6,
      left: 0,
      width: UNDERLINE_WIDTH,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.primary
    }
  });

export default WeekStrip;
