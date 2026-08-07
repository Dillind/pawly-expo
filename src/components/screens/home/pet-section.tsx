import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import PetAvatar from '@/components/screens/home/pet-avatar';
import ScheduledTimeList from '@/components/ui/scheduled-time-list';
import { Radius, type AppTheme } from '@/constants/theme';
import { useSlotStates } from '@/hooks/queries/use-slot-states';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { createShadowMedium } from '@/lib/styles/shadows';
import { formatScheduledTime } from '@/lib/dates';
import type { HouseholdMember, Pet, SlotState } from '@/types/core';
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
  onPickSlot: (pet: Pet, slot: SlotState) => void;
  onLogPress: () => void;
};

/** "logged", never "fed" -- the count is of records, not meals. CONTEXT.md, Not Logged. */
function summarise(slots: SlotState[], hasBadge: boolean): string {
  const logged = slots.filter((slot) => slot.state === 'fed').length;
  const summary = `${logged} of ${slots.length} logged`;

  // Both on one line wraps, and the badge already names what is outstanding.
  if (hasBadge) return summary;

  const next = slots.find((slot) => slot.state === 'due' || slot.state === 'upcoming');
  if (!next) return summary;

  return `${summary} · next ${formatScheduledTime(next.scheduledTime)}`;
}

/**
 * One pet's feed times for today, collapsed until asked for.
 *
 * The slot query lives here rather than in Home because a hook cannot be called
 * once per item from a loop.
 */
const PetSection = ({
  pet,
  timezone,
  today,
  members,
  isOnlyPet,
  onOpenLog,
  onPickSlot,
  onLogPress
}: Props) => {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const router = useRouter();

  // Not persisted on purpose: an expansion surviving a relaunch rebuilds the
  // cluttered screen this replaced.
  const [isExpanded, setIsExpanded] = useState(isOnlyPet);

  const { data: slots, isLoading } = useSlotStates(pet.id, today, { live: true });

  const notLogged = slots?.filter((slot) => slot.state === 'missed').length ?? 0;
  const isAllLogged = Boolean(slots?.length) && slots?.every((slot) => slot.state === 'fed');
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
          onPress={() => router.push(`/home/pet/${pet.id}`)}>
          <PetAvatar photoUrl={pet.photoUrl} size={40} />

          <View style={styles.names}>
            <AppText size={18} fontWeight="bold">
              {pet.name}
            </AppText>
            {slots && (
              <AppText size={13} color="textSecondary" numberOfLines={1}>
                {summarise(slots, hasBadge)}
              </AppText>
            )}
          </View>
        </PressableOpacity>

        {hasBadge && (
          <View style={styles.badge}>
            <AppText size={12} color="error">
              {notLogged} not logged
            </AppText>
          </View>
        )}

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
            entering={FadeIn.duration(EXPAND_MS)}
            exiting={FadeOut.duration(COLLAPSE_MS)}>
            <View style={styles.slotsDivider} />
            {slots && (
              <ScheduledTimeList
                slots={slots}
                timezone={timezone}
                members={members}
                isNested
                onOpenLog={onOpenLog}
                onPickSlot={(slot) => onPickSlot(pet, slot)}
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
    // Drawn only when the slots are showing, so a collapsed row is a plain card.
    slotsDivider: {
      height: StyleSheet.hairlineWidth,
      marginTop: spacing.two,
      backgroundColor: colors.backgroundSelected
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
    badge: {
      paddingHorizontal: spacing.two,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.backgroundElement
    },
    slots: {
      gap: spacing.two
    }
  });

export default PetSection;
