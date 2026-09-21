import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

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
import { IconSize, Radius, type AppTheme } from '@/constants/theme';
import { useFeedTimes } from '@/hooks/queries/feeding/use-feed-times';
import { useOccurrences } from '@/hooks/queries/feeding/use-occurrences';
import { usePetPause } from '@/hooks/queries/feeding/use-pet-pause';
import { isTickPending, useTickReminder } from '@/hooks/queries/reminder/use-reminder-mutations';
import { useReminders } from '@/hooks/queries/reminder/use-reminders';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { todayInTimezone } from '@/lib/dates';
import { createShadowMedium } from '@/lib/styles/shadows';
import type { HouseholdMember, Occurrence, Pet } from '@/types/core';
import { summarisePetDay } from '@/utils/pet-status';

const EXPAND_MS = 220;
const COLLAPSE_MS = 160;

type Props = {
  pet: Pet;
  timezone: string;
  day: string;
  members: HouseholdMember[];
  isOnlyPet: boolean;
  isOwner: boolean;
  onOpenLog: (logId: string) => void;
  onPickOccurrence: (pet: Pet, occurrence: Occurrence) => void;
  onLogPress: () => void;
};

// The occurrence query lives here rather than in Home because a hook cannot be
// called once per item from a loop.
const PetSection = ({
  pet,
  timezone,
  day,
  members,
  isOnlyPet,
  isOwner,
  onOpenLog,
  onPickOccurrence,
  onLogPress
}: Props) => {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const router = useRouter();

  // Only today ages on the server, so polling another day asks once a minute
  // for an answer that cannot change.
  const isToday = day === todayInTimezone(timezone);
  const { data: occurrences, isLoading } = useOccurrences(pet.id, day, { live: isToday });
  const { data: pause } = usePetPause(pet.id, day);
  const { data: feedTimes } = useFeedTimes(pet.id);
  const { data: reminders = [] } = useReminders(pet.id, day);
  const { mutate: tickReminder, isPending: isTicking, variables: tickingInput } = useTickReminder();
  const reminderTrayRef = useRef<TrueSheet | null>(null);
  const isPaused = Boolean(pause);
  const hasFeedTimes = Boolean(feedTimes?.length);

  const isAllLogged =
    !isPaused &&
    Boolean(occurrences?.length) &&
    occurrences?.every((occurrence) => occurrence.state === 'fed');

  // Not persisted: an expansion surviving a relaunch rebuilds the cluttered
  // screen this replaced.
  const [isExpanded, setIsExpanded] = useState<boolean | null>(null);
  const isOpen = isExpanded ?? (isOnlyPet || !isAllLogged);

  // Seeded, not animated: a section that starts open must already have its
  // caret turned rather than rotate it into place.
  const rotation = useSharedValue(isOpen ? 180 : 0);

  useEffect(() => {
    rotation.set(withTiming(isOpen ? 180 : 0, { duration: isOpen ? EXPAND_MS : COLLAPSE_MS }));
  }, [isOpen, rotation]);

  const caretStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get()}deg` }]
  }));

  return (
    <>
      <Animated.View
        style={[styles.card, createShadowMedium(theme.colors)]}
        layout={LinearTransition.duration(EXPAND_MS)}>
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

          {isAllLogged && <Icon name="check" size={IconSize.action} color="success" />}

          {/* The tray writes against now, so it is not offered on another day. */}
          {isToday && !isPaused && (
            <IconButton
              name="plus"
              accessibilityLabel={`Log something else for ${pet.name}`}
              variant="ghost"
              size={IconSize.control}
              onPress={onLogPress}
            />
          )}

          <Animated.View style={caretStyle}>
            <IconButton
              name="caretDown"
              accessibilityLabel={isOpen ? `Hide ${pet.name}'s feeds` : `Show ${pet.name}'s feeds`}
              variant="ghost"
              size={IconSize.control}
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
                // Still on Home: hiding it would read as deleted.
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
                      : isOwner
                        ? `Add ${pet.name}'s feed times and everyone will know when they are due.`
                        : `No feed times yet. An owner sets ${pet.name}'s feed times.`}
                  </AppText>
                  {!hasFeedTimes && isOwner && (
                    <MainButton
                      text="Set up feeds"
                      size="sm"
                      onPress={() => router.push(`/home/${pet.id}`)}
                    />
                  )}
                </View>
              )}

              {!isPaused &&
                reminders.map((reminder) => (
                  <ReminderRow
                    key={reminder.reminderId}
                    reminder={reminder}
                    isTicking={isTickPending(
                      isTicking,
                      tickingInput,
                      reminder.reminderId,
                      reminder.occurrenceDate
                    )}
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
    // Only shown when expanded, so a collapsed row owes this gap nothing.
    occurrences: {
      marginTop: spacing.two
    },
    empty: {
      gap: spacing.two,
      paddingTop: spacing.three
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
    // On its own line: a narrow phone's header row could not hold both, and it
    // was the name that broke.
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4
    }
  });

export default PetSection;
