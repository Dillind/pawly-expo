import AppText from '@/components/core/app-text';
import Divider from '@/components/core/divider';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import PetAvatar from '@/components/screens/home/pet-avatar';
import OccurrenceList from '@/components/ui/occurrence-list';
import { Radius, type AppTheme } from '@/constants/theme';
import { useOccurrences } from '@/hooks/queries/feeding/use-occurrences';
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

/** "logged", never "fed" -- the count is of records, not meals. CONTEXT.md, Not Logged. */
function summarise(occurrences: Occurrence[], hasBadge: boolean): string {
  const logged = occurrences.filter((occurrence) => occurrence.state === 'fed').length;
  const summary = `${logged} of ${occurrences.length} logged`;

  // Both on one line wraps, and the badge already names what is outstanding.
  if (hasBadge) return summary;

  const next = occurrences.find(
    (occurrence) => occurrence.state === 'due' || occurrence.state === 'upcoming'
  );
  if (!next) return summary;

  return `${summary} · next ${formatScheduledTime(next.localTime)}`;
}

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

  // Not persisted on purpose: an expansion surviving a relaunch rebuilds the
  // cluttered screen this replaced.
  const [isExpanded, setIsExpanded] = useState(isOnlyPet);

  const { data: occurrences, isLoading } = useOccurrences(pet.id, today, { live: true });

  const notLogged =
    occurrences?.filter((occurrence) => occurrence.state === 'missed').length ?? 0;
  const isAllLogged =
    Boolean(occurrences?.length) && occurrences?.every((occurrence) => occurrence.state === 'fed');
  const hasBadge = notLogged > 0 && !isExpanded;

  const caretStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withTiming(isExpanded ? '180deg' : '0deg', {
          duration: isExpanded ? EXPAND_MS : COLLAPSE_MS
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
              <View style={styles.summaryRow}>
                <AppText size={13} color="textSecondary" numberOfLines={1}>
                  {summarise(occurrences, hasBadge)}
                </AppText>
                {hasBadge && (
                  <AppText size={13} color="error" numberOfLines={1}>
                    · {notLogged} not logged
                  </AppText>
                )}
              </View>
            )}
          </View>
        </PressableOpacity>

        {/* Nothing outstanding, so the fast path has nothing to be fast about. */}
        {isAllLogged ? (
          <Icon name="check" size={20} color="primary" />
        ) : (
          <IconButton
            name="utensils"
            accessibilityLabel={`Log a feed for ${pet.name}`}
            variant="secondary"
            size={18}
            onPress={onLogPress}
          />
        )}

        <Animated.View style={caretStyle}>
          <IconButton
            name="caretDown"
            accessibilityLabel={
              isExpanded ? `Hide ${pet.name}'s feed times` : `Show ${pet.name}'s feed times`
            }
            variant="ghost"
            size={18}
            hapticFeedback={false}
            onPress={() => setIsExpanded((current) => !current)}
          />
        </Animated.View>
      </View>

      {isExpanded &&
        (isLoading ? (
          <ActivityIndicator />
        ) : (
          <Animated.View
            style={styles.occurrences}
            entering={FadeIn.duration(EXPAND_MS)}
            exiting={FadeOut.duration(COLLAPSE_MS)}>
            <Divider />
            {occurrences && (
              <OccurrenceList
                occurrences={occurrences}
                timezone={timezone}
                members={members}
                isNested
                onOpenLog={onOpenLog}
                onPickOccurrence={(occurrence) => onPickOccurrence(pet, occurrence)}
              />
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
