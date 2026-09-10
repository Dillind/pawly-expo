import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { IconName } from '@/constants/icon-map';
import { Radius, type AppTheme } from '@/constants/theme';
import { useFollowedHouseholdIds } from '@/hooks/queries/follow/use-follows';
import { useStyles } from '@/hooks/use-styles';
import { createShadowMedium } from '@/lib/styles/shadows';
import { countDigits } from '@/utils/counts';

type DoorProps = {
  icon: IconName;
  isPrimaryDoor?: boolean;
  title: string;
  description: string;
  action: ReactNode;
};

const Door = ({ icon, isPrimaryDoor, title, description, action }: DoorProps) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.door}>
      <View style={styles.doorHeading}>
        <View style={[styles.tile, isPrimaryDoor && styles.tilePrimary]}>
          <Icon name={icon} size={20} color={isPrimaryDoor ? 'primaryText' : 'textSecondary'} />
        </View>
        <AppText variant="header" size={19}>
          {title}
        </AppText>
      </View>

      <AppText size={14} color="textSecondary">
        {description}
      </AppText>

      {action}
    </View>
  );
};

/**
 * Home for someone who belongs to no household. This is the whole of
 * onboarding now — two doors on a screen you can leave, rather than a wizard
 * that holds you until you create a pet.
 *
 * Zero households is a valid, permanent state. A sitter or dog walker has no
 * pets of their own and never will, so this must not nag.
 *
 * A waiting invite is deliberately not surfaced here. Joining a household is
 * something the invitee starts — by scanning the QR or entering the code —
 * never something the app puts in front of them. The record of an invite
 * belongs in the notification inbox (#19).
 */
const NoHouseholdState = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const followedCount = useFollowedHouseholdIds().length;

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <AppText variant="header" size={28}>
          Welcome to Crumpet
        </AppText>
        <AppText size={15} color="textSecondary">
          Two ways in. Pick the one that sounds like you.
        </AppText>
      </View>

      <View style={styles.doors}>
        <Door
          icon="pawPrint"
          isPrimaryDoor
          title="I look after a pet"
          description="We create a household you own, and your pet is the first thing in it. Invite the rest of the house whenever you like."
          action={<MainButton text="Add a pet" href="/home/add-pet" />}
        />

        <Door
          icon="users"
          title="Someone invited me"
          description="Join their household with the code they sent. You'll see their pets, feeds and posts. You won't need a pet of your own."
          action={
            <MainButton
              text="Join a household"
              variant="secondary"
              onPress={() => router.push('/home/join-household')}
            />
          }
        />
      </View>

      {/* Home is the care surface and a followed household is not care, so it
          never enters the switcher. Without this line the two doors above tell
          a follower to create or join, which is not what they came for. */}
      {followedCount > 0 && (
        <PressableOpacity
          accessibilityRole="button"
          accessibilityLabel="Households you follow"
          onPress={() => router.push('/profile/following')}>
          <View style={styles.followCard}>
            <Icon name="users" size={18} color="textSecondary" />
            <View style={styles.followText}>
              <AppText size={16} numberOfLines={1}>
                You follow {countDigits(followedCount, 'household')}
              </AppText>
              <AppText size={13} color="textSecondary">
                Their posts are on the Posts tab.
              </AppText>
            </View>
            <Icon name="caretRight" size={16} color="textSecondary" />
          </View>
        </PressableOpacity>
      )}

      <AppText size={13} align="center" color="textSecondary">
        You can do the other one later. Neither choice is final.
      </AppText>
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      gap: spacing.four,
      paddingTop: spacing.three
    },
    intro: {
      gap: spacing.one
    },
    doors: {
      gap: spacing.three
    },
    door: {
      gap: spacing.three,
      padding: spacing.four,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement,
      ...createShadowMedium(colors)
    },
    doorHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    tile: {
      width: 38,
      height: 38,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSelected
    },
    tilePrimary: {
      backgroundColor: colors.primaryMuted
    },
    followCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      padding: spacing.three,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    followText: {
      flex: 1,
      gap: spacing.half
    }
  });

export default NoHouseholdState;
