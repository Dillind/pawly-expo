import type { LegendListRef } from '@legendapp/list/react-native';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import AppText from '@/components/core/app-text';
import MainLegendList from '@/components/core/main-legend-list';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { dayOfMonth, shiftWeeks, weekdayInitial, weekOf } from '@/lib/dates';
import { hapticSelection } from '@/lib/haptics';
import type { ReminderKind } from '@/types/core';

const SLIDE_MS = 260;
const UNDERLINE_WIDTH = 18;
const WEEKS_EACH_SIDE = 52;
const VIEWABILITY = { itemVisiblePercentThreshold: 60 };

type Props = {
  /** The day in view. Not necessarily today. */
  selectedDay: string;
  /** Today in the household's timezone, so a past day can be told apart. */
  today: string;
  reminderKinds?: Record<string, ReminderKind[]>;
  onSelectDay: (day: string) => void;
};

// Warm ink for a feed, not gold: issue #122 gives gold exactly three jobs --
// the banner wash, the Log chip, the active tab. A fourth drains the other
// three. The Kind colours are on trial; see DECISIONS.md.
const DOT_COLOUR = {
  feed: 'text',
  medication: 'medication',
  vet: 'vet'
} as const;

/**
 * The week the selected day sits in, one full-width page per week.
 *
 * The window is anchored on today, not on the selection -- rebuilding it around
 * the selected day would renumber every index mid-scroll.
 */
const WeekStrip = ({ selectedDay, today, reminderKinds, onSelectDay }: Props) => {
  const styles = useStyles(makeStyles);
  const { width: pageWidth } = useWindowDimensions();

  const listRef = useRef<LegendListRef>(null);
  // The viewability callback must stay stable, so it reads these rather than
  // closing over them.
  const selectedRef = useRef(selectedDay);
  const onSelectRef = useRef(onSelectDay);

  useEffect(() => {
    selectedRef.current = selectedDay;
    onSelectRef.current = onSelectDay;
  }, [selectedDay, onSelectDay]);

  const visibleWeek = useRef(weekOf(selectedDay)[0]);
  const isJumping = useRef(false);

  const weeks = useMemo(() => {
    const anchor = weekOf(today)[0];

    return Array.from({ length: WEEKS_EACH_SIDE * 2 + 1 }, (_, index) =>
      shiftWeeks(anchor, index - WEEKS_EACH_SIDE)
    );
  }, [today]);

  // A page is recycled, not rebuilt, so nothing else tells it the day moved.
  const extraData = useMemo(() => ({ selectedDay, reminderKinds }), [selectedDay, reminderKinds]);

  const selectedWeek = weekOf(selectedDay)[0];
  const selectedIndex = Math.max(0, weeks.indexOf(selectedWeek));

  // The month popover writes the selection and knows nothing about this list.
  useEffect(() => {
    if (visibleWeek.current === selectedWeek) return;

    visibleWeek.current = selectedWeek;
    isJumping.current = true;
    listRef.current?.scrollToIndex({ index: selectedIndex, animated: true });
  }, [selectedWeek, selectedIndex]);

  // LegendList adjusts its own scroll offset, so the offset cannot name the
  // page -- only viewability can.
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: string }[] }) => {
      const week = viewableItems.at(0)?.item;

      if (!week) return;

      const current = weekOf(selectedRef.current);

      // A multi-page jump makes every week in between briefly visible.
      if (isJumping.current) {
        if (week === current[0]) isJumping.current = false;

        return;
      }

      visibleWeek.current = week;

      if (week === current[0]) return;

      // The same weekday, so paging a week does not also move the day.
      void hapticSelection();
      onSelectRef.current(weekOf(week)[current.indexOf(selectedRef.current)]);
    },
    []
  );

  return (
    <View style={styles.bleed}>
      <MainLegendList
        ref={listRef}
        data={weeks}
        keyExtractor={(week) => week}
        getFixedItemSize={() => pageWidth}
        estimatedItemSize={pageWidth}
        initialScrollIndex={selectedIndex}
        extraData={extraData}
        horizontal
        pagingEnabled
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY}
        renderItem={({ item }) => (
          <WeekPage
            weekStart={item}
            selectedDay={selectedDay}
            today={today}
            reminderKinds={reminderKinds}
            width={pageWidth}
            onSelectDay={onSelectDay}
          />
        )}
      />
    </View>
  );
};

type PageProps = Props & { weekStart: string; width: number };

const WeekPage = ({
  weekStart,
  selectedDay,
  today,
  reminderKinds,
  width,
  onSelectDay
}: PageProps) => {
  const styles = useStyles(makeStyles);
  const theme = useTheme();

  const days = weekOf(weekStart);
  const selectedIndex = days.indexOf(selectedDay);
  const cellWidth = (width - ScreenGutter * 2 - theme.spacing.one * 6) / 7;

  const underlineStyle = useAnimatedStyle(() => {
    const left =
      selectedIndex * (cellWidth + theme.spacing.one) + (cellWidth - UNDERLINE_WIDTH) / 2;

    return {
      opacity: selectedIndex < 0 ? 0 : 1,
      transform: [{ translateX: withTiming(Math.max(0, left), { duration: SLIDE_MS }) }]
    };
  });

  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.row}>
        {days.map((day) => {
          const isSelected = day === selectedDay;
          const isToday = day === today;
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
              {/* Today keeps a mark once the strip pages away from it. Gold ink,
                  not a gold fill -- the fill means "selected". */}
              <AppText
                variant="header"
                size={16}
                fontWeight="bold"
                color={todayColour(isSelected, isToday, isPast)}>
                {dayOfMonth(day)}
              </AppText>
              {/* Always rendered -- a slot that appears would resize the cell. */}
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
    </View>
  );
};

const todayColour = (isSelected: boolean, isToday: boolean, isPast: boolean) => {
  if (isSelected) return 'text';
  if (isToday) return 'primaryText';

  return isPast ? 'textSecondary' : 'text';
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    // Out of the screen's gutter, so a page is exactly the screen width.
    bleed: {
      marginHorizontal: -ScreenGutter,
      height: 58
    },
    page: {
      paddingHorizontal: ScreenGutter
    },
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
    // Without this margin the underline covers the dots. See KNOWLEDGE.md.
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
