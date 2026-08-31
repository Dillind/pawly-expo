import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { dayOfMonth, shiftWeeks, weekOf, weekdayInitial } from '@/lib/dates';
import { hapticSelection } from '@/lib/haptics';
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
  onSelectDay: (day: string) => void;
};

/**
 * The week the selected day sits in, Monday to Sunday.
 *
 * This is the day header and the way to move between days, so it stands up on
 * its own. Reminder dots go under the date once CRU-078 lands; the cell already
 * leaves the room for them.
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
const WeekStrip = ({ selectedDay, today, onSelectDay }: Props) => {
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
              {/* Held open for the Reminder dot -- CRU-078. Without it the cells
                would resize the day the dots arrive. */}
              <View style={styles.dotSlot} />
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
    dotSlot: {
      height: 4
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
