import AppText from '@/components/core/app-text';
import Divider from '@/components/core/divider';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import PetAvatar from '@/components/screens/home/pet-avatar';
import OccurrenceList from '@/components/ui/occurrence-list';
import { Radius, type AppTheme } from '@/constants/theme';
import { useOccurrences } from '@/hooks/queries/feeding/use-occurrences';
import { usePetPause } from '@/hooks/queries/feeding/use-pet-pause';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { createShadowMedium } from '@/lib/styles/shadows';
import { formatScheduledTime } from '@/lib/dates';
import type { HouseholdMember, Occurrence, Pet } from '@/types/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
  today: string;
  members: HouseholdMember[];
  isOnlyPet: boolean;
  onOpenLog: (logId: string) => void;
  onPickOccurrence: (pet: Pet, occurrence: Occurrence) => void;
  onLogPress: () => void;
};

const LABEL_WORD: Record<Occurrence['label'], string> = {
  morning: 'morning',
  lunch: 'lunch',
  dinner: 'dinner',
  custom: 'feed'
};

/**
 * The one line under the pet's name. It answers "what, if anything, do I do
 * about this pet right now" — an overdue feed first, then the next one due,
 * then the quiet case.
 *
 * "logged", never "fed" -- the count is of records, not meals, and the app does
 * not know whether the pet ate. CONTEXT.md, Not Logged.
 */
function summarise(occurrences: Occurrence[], isPaused: boolean): string {
  // A paused pet also has no occurrences, so this has to come first — otherwise
  // a boarding pet reads as one nobody has set up.
  if (isPaused) return 'Paused — no feeds expected';
  if (occurrences.length === 0) return 'No feeds set up yet';

  const overdue = occurrences.find((occurrence) => occurrence.state === 'missed');
  if (overdue) {
    return `${capitalise(LABEL_WORD[overdue.label])} was due at ${formatScheduledTime(overdue.localTime)}`;
  }

  const next = occurrences.find(
    (occurrence) => occurrence.state === 'due' || occurrence.state === 'upcoming'
  );
  if (next) {
    return `Next: ${LABEL_WORD[next.label]} at ${formatScheduledTime(next.localTime)}`;
  }

  return occurrences.length === 1 ? 'Logged once today' : `Logged ${occurrences.length} times today`;
}

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * One pet's feed times for today, collapsed until asked for.
 *
 * The occurrence query lives here rather than in Home because a hook cannot be
 * called once per item from a loop.
 */
const PetSection = ({
  pet,
  timezone,
  today,
  members,
  isOnlyPet,
  onOpenLog,
  onPickOccurrence,
  onLogPress
}: Props) => {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const router = useRouter();

  const { data: occurrences, isLoading } = useOccurrences(pet.id, today, { live: true });
  const { data: pause } = usePetPause(pet.id, today);
  const isPaused = Boolean(pause);

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
                {summarise(occurrences, isPaused)}
              </AppText>
            )}
          </View>
        </PressableOpacity>

        {/* Nothing outstanding, so the fast path has nothing to be fast about.
            Every row already carries its own Log button. */}
        {isAllLogged && <Icon name="check" size={20} color="primary" />}

        <Animated.View style={caretStyle}>
          <IconButton
            name="caretDown"
            accessibilityLabel={
              isOpen ? `Hide ${pet.name}'s feeds` : `Show ${pet.name}'s feeds`
            }
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
                onOpenLog={onOpenLog}
                onPickOccurrence={(occurrence) => onPickOccurrence(pet, occurrence)}
              />
            ) : (
              // Skipping the schedule stays viable -- the log is the habit and
              // the schedule is the upgrade, so this offers both.
              <View style={styles.empty}>
                <AppText size={14} color="textSecondary">
                  Add {pet.name}&apos;s feed times and everyone will know when they are due.
                </AppText>
                <MainButton
                  text="Set up feeds"
                  size="sm"
                  onPress={() => router.push(`/home/${pet.id}`)}
                />
                <MainButton text="Just log a feed" variant="text" size="sm" onPress={onLogPress} />
              </View>
            )}
          </Animated.View>
        ))}
    </Animated.View>
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
