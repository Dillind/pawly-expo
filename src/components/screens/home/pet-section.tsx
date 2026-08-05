import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import SlotRow from '@/components/ui/slot-row';
import { Radius, type AppTheme } from '@/constants/theme';
import { useSlotStates } from '@/hooks/queries/use-slot-states';
import { useStyles } from '@/hooks/use-styles';
import type { HouseholdMember, Pet } from '@/types/core';
import { memberDisplayName } from '@/utils/members';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

type Props = {
  pet: Pet;
  timezone: string;
  today: string;
  members: HouseholdMember[];
  /** The only pet in the household gets the screen's own header, not a section one. */
  isOnlyPet: boolean;
  onSlotPress: (logId: string) => void;
  onLogPress: () => void;
};

/**
 * One pet's feed times for today. The slot query lives here rather than in Home
 * because a hook cannot be called once per item from a loop.
 */
const PetSection = ({
  pet,
  timezone,
  today,
  members,
  isOnlyPet,
  onSlotPress,
  onLogPress
}: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: slots, isLoading } = useSlotStates(pet.id, today, { live: true });

  return (
    <View style={styles.section}>
      {isOnlyPet ? (
        <AppText variant="header" size={32}>
          {pet.name}
        </AppText>
      ) : (
        // Header and log button are siblings, not nested: a tap target inside a
        // tap target is ambiguous, and the same reasoning is written up on
        // FeedLogRow's trailing cluster.
        <View style={styles.headerRow}>
          <PressableOpacity
            style={styles.header}
            accessibilityRole="button"
            accessibilityLabel={`Open ${pet.name}`}
            onPress={() => router.push(`/home/pet/${pet.id}`)}>
            {pet.photoUrl ? (
              <Image source={pet.photoUrl} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Icon name="pawPrint" size={16} color="primary" />
              </View>
            )}
            <AppText size={20} fontWeight="bold" style={styles.name}>
              {pet.name}
            </AppText>
            <Icon name="caretRight" size={18} color="textSecondary" />
          </PressableOpacity>

          {/* Each pet logs its own feed. The popover's action cannot serve
              several pets without asking which one, and the section already
              answers that. */}
          <IconButton
            name="utensils"
            accessibilityLabel={`Log a feed for ${pet.name}`}
            variant="secondary"
            size={18}
            onPress={onLogPress}
          />
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.slots}>
          {slots?.map((slot) => {
            const logId = slot.state === 'fed' ? slot.satisfyingLogId : null;

            return (
              <SlotRow
                key={slot.scheduleId}
                slot={slot}
                timezone={timezone}
                fedBy={memberDisplayName(members, slot.satisfiedBy)}
                onPress={logId ? () => onSlotPress(logId) : undefined}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    section: {
      gap: spacing.two
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    header: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      paddingVertical: spacing.one
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundSelected
    },
    avatarPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryMuted
    },
    name: {
      flex: 1
    },
    slots: {
      gap: spacing.two
    }
  });

export default PetSection;
