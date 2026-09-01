import ReminderTray from '@/components/bottom-sheets/reminder-tray';
import AppText from '@/components/core/app-text';
import Divider from '@/components/core/divider';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import PetAvatar from '@/components/screens/home/pet-avatar';
import OccurrenceList from '@/components/ui/occurrence-list';
import ReminderRow from '@/components/ui/reminder-row';
import { Radius, type AppTheme } from '@/constants/theme';
import { useOccurrences } from '@/hooks/queries/feeding/use-occurrences';
import { useFeedTimes } from '@/hooks/queries/feeding/use-feed-times';
import { usePetPause } from '@/hooks/queries/feeding/use-pet-pause';
import { useTickReminder } from '@/hooks/queries/reminder/use-reminder-mutations';
import { useReminders } from '@/hooks/queries/reminder/use-reminders';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { createShadowMedium } from '@/lib/styles/shadows';
import { todayInTimezone } from '@/lib/dates';
import { summarisePetDay } from '@/utils/pet-status';
import type { HouseholdMember, Occurrence, Pet } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withTiming
} from 'react-native-reanimated';

const EXPAND_MS = 220;
const COLLAPSE_MS = 160;

type Props = {
  pet: Pet;
  timezone: string;
  /** The day in view. Today until the week strip moves. */
  day: string;
  members: HouseholdMember[];
  isOnlyPet: boolean;
  onOpenLog: (logId: string) => void;
  onPickOccurrence: (pet: Pet, occurrence: Occurrence) => void;
  onLogPress: () => void;
};

/**
 * One pet's feed times for today, collapsed until asked for.
 *
 * The occurrence query lives here rather than in Home because a hook cannot be
 * called once per item from a loop.
 */
const PetSection = ({
  pet,
  timezone,
  day,
  members,
  isOnlyPet,
  onOpenLog,
  onPickOccurrence,
  onLogPress
}: Props) => {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const router = useRouter();

  // Live polling is for today only. `state` ages on the server, but a past or
  // future day's states do not move, so polling one is a request per minute for
  // an answer that cannot change.
  const isToday = day === todayInTimezone(timezone);
  const { data: occurrences, isLoading } = useOccurrences(pet.id, day, { live: isToday });
  const { data: pause } = usePetPause(pet.id, day);
  const { data: feedTimes } = useFeedTimes(pet.id);
  const { data: reminders = [] } = useReminders(pet.id, day);
  const { mutate: tickReminder, isPending: isTicking } = useTickReminder();
  const reminderTrayRef = useRef<TrueSheet | null>(null);
  const isPaused = Boolean(pause);
  const hasFeedTimes = Boolean(feedTimes?.length);

  const isAllLogged =
    !isPaused &&
    Boolean(occurrences?.length) &&
    occurrences?.every((occurrence) => occurrence.state === 'fed');

  // A done card collapses: the screen gets quieter as the day goes right.
  // Not persisted on purpose -- an expansion surviving a relaunch rebuilds the
  // cluttered screen this replaced.
  const [isExpanded, setIsExpanded] = useState<boolean | null>(null);
  const isOpen = isExpanded ?? (isOnlyPet || !isAllLogged);

  const caretStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withTiming(isOpen ? '180deg' : '0deg', {
          duration: isOpen ? EXPAND_MS : COLLAPSE_MS
        })
      }
    ]
  }));

  return (
    <>
      <Animated.View
        style={[styles.card, createShadowMedium(theme.colors)]}
        layout={LinearTransition.duration(EXPAND_MS)}>
        {/* Siblings rather than nested: a tap target inside a tap target is
          ambiguous, as written up on FeedLogRow's trailing cluster. */}
        <View style={styles.headerRow}>
          <PressableOpacity
            style={styles.identity}
            accessibilityRole="button"
            accessibilityLabel={`Open ${pet.name}`}
            onPress={() => router.push(`/home/${pet.id}`)}>
            <PetAvatar photoUrl={pet.photoUrl} size={40} />

            <View style={styles.names}>
              <AppText size={18} fontWeight="bold" numberOfLines={1}>
                {pet.name}
              </AppText>
              {occurrences && (
                <AppText size={13} color="textSecondary" numberOfLines={1}>
                  {summarisePetDay(occurrences, isPaused, hasFeedTimes)}
                </AppText>
              )}
            </View>
          </PressableOpacity>

          {/* Nothing outstanding, so the fast path has nothing to be fast about.
            Every row already carries its own Log button. */}
          {isAllLogged && <Icon name="check" size={20} color="success" />}

          <Animated.View style={caretStyle}>
            <IconButton
              name="caretDown"
              accessibilityLabel={isOpen ? `Hide ${pet.name}'s feeds` : `Show ${pet.name}'s feeds`}
              variant="ghost"
              size={18}
              hapticFeedback={false}
              onPress={() => setIsExpanded(!isOpen)}
            />
          </Animated.View>
        </View>

        {isOpen &&
          (isLoading ? (
            <ActivityIndicator />
          ) : (
            <Animated.View
              style={styles.occurrences}
              entering={FadeIn.duration(EXPAND_MS)}
              exiting={FadeOut.duration(COLLAPSE_MS)}>
              <Divider />
              {isPaused ? (
                // Still on Home, because hiding it would read as deleted. It just
                // expects nothing.
                <View style={styles.empty}>
                  <AppText size={14} color="textSecondary">
                    {pet.name} is paused. No feeds are expected and nobody is nudged.
                  </AppText>
                  <MainButton
                    text="Manage pause"
                    variant="text"
                    size="sm"
                    onPress={() => router.push(`/home/${pet.id}`)}
                  />
                </View>
              ) : occurrences?.length ? (
                <OccurrenceList
                  occurrences={occurrences}
                  timezone={timezone}
                  members={members}
                  isNested
                  isToday={isToday}
                  onOpenLog={onOpenLog}
                  onPickOccurrence={(occurrence) => onPickOccurrence(pet, occurrence)}
                />
              ) : (
                <View style={styles.empty}>
                  <AppText size={14} color="textSecondary">
                    {hasFeedTimes
                      ? `Nothing is due for ${pet.name} ${isToday ? 'today' : 'that day'}. Their next feed is on the way.`
                      : `Add ${pet.name}'s feed times and everyone will know when they are due.`}
                  </AppText>
                  {/* Skipping the schedule stays viable -- the log is the habit
                    and the schedule is the upgrade, so this offers both. */}
                  {!hasFeedTimes && (
                    <MainButton
                      text="Set up feeds"
                      size="sm"
                      onPress={() => router.push(`/home/${pet.id}`)}
                    />
                  )}
                </View>
              )}

              {/* A Reminder is a row in the same list as the feeds, not a section
                of its own -- artboard 5 draws the two as one stack. A past day
                is read-only, so the Done chip goes with everything else. */}
              {!isPaused &&
                reminders.map((reminder) => (
                  <ReminderRow
                    key={reminder.reminderId}
                    reminder={reminder}
                    isTicking={isTicking}
                    onTick={
                      isToday
                        ? () =>
                            tickReminder({
                              reminderId: reminder.reminderId,
                              occurrenceDate: reminder.occurrenceDate,
                              isDone: reminder.state === 'done'
                            })
                        : undefined
                    }
                  />
                ))}

              {/* The log tray writes against now, so it is not offered on another
                day. Paused means nothing is expected, including this. */}
              {isToday && !isPaused && (
                <PressableOpacity
                  style={styles.other}
                  accessibilityRole="button"
                  accessibilityLabel={`Log something else for ${pet.name}`}
                  onPress={onLogPress}>
                  <Icon name="plus" size={17} color="textSecondary" />
                  <AppText size={15} color="textSecondary">
                    Other
                  </AppText>
                </PressableOpacity>
              )}

              {/* A text button, not a second dashed row: two ghost rows stacked
                read as one broken control. Matches the Pet screen's trigger. */}
              {isToday && !isPaused && (
                <MainButton
                  text="Add a reminder"
                  variant="text"
                  size="sm"
                  onPress={() => void reminderTrayRef.current?.present()}
                />
              )}
            </Animated.View>
          ))}
      </Animated.View>

      {/* A sibling, never a child. */}
      <ReminderTray sheetRef={reminderTrayRef} pet={pet} today={day} />
    </>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    card: {
      paddingVertical: spacing.two,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.card,
      backgroundColor: colors.backgroundElement
    },
    // The rule and the times only show when expanded, so a collapsed row is a
    // plain card and owes this gap nothing.
    occurrences: {
      marginTop: spacing.two
    },
    empty: {
      gap: spacing.two,
      paddingTop: spacing.three
    },
    // Dashed rather than filled: it is always available and never the thing to
    // do, so it must not read as loud as a Log chip.
    other: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      height: 44,
      marginTop: spacing.one,
      paddingHorizontal: spacing.two,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.ghostBorder,
      borderRadius: 14
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    identity: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.one
    },
    names: {
      flex: 1,
      gap: 2
    },
    // On the second line rather than beside the name: on a narrow phone the
    // header row could not hold both, and it was the name that broke.
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4
    }
  });

export default PetSection;
