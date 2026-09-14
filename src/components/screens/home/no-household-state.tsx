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

// What the flow behind the first door will ask for, in its order. A door with
// four named steps behind it reads as short; an unlabelled button does not.
const FLOW_STEPS: { icon: IconName; label: string }[] = [
  { icon: 'house', label: 'Household' },
  { icon: 'camera', label: 'Pet' },
  { icon: 'utensils', label: 'Feeds' },
  { icon: 'userPlus', label: 'Invite' }
];

type DoorProps = {
  icon: IconName;
  isPrimaryDoor?: boolean;
  title: string;
  description: string;
  hasSteps?: boolean;
  action: ReactNode;
};

const Door = ({ icon, isPrimaryDoor, title, description, hasSteps, action }: DoorProps) => {
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

      {hasSteps && (
        <View style={styles.steps}>
          {FLOW_STEPS.map((step) => (
            <View key={step.label} style={styles.step}>
              <Icon name={step.icon} size={19} color="textSecondary" />
              <AppText size={12} color="textSecondary">
                {step.label}
              </AppText>
            </View>
          ))}
        </View>
      )}

      {action}
    </View>
  );
};

// Zero households is a valid permanent state, so this must not nag. A waiting
// invite is deliberately absent: joining is something the invitee starts.
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
          hasSteps
          title="I look after a pet"
          description="Name your household, add your first pet, then invite the rest of the house."
          action={<MainButton text="Set up your household" href="/home/new-household" />}
        />

        <Door
          icon="users"
          title="Someone invited me"
          description="Join with the code they sent. You won't need a pet of your own."
          action={
            <MainButton
              text="Enter a code"
              variant="secondary"
              onPress={() => router.push('/home/join-household')}
            />
          }
        />
      </View>

      {/* A followed household is not care, so it
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
    steps: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.three - spacing.half,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border
    },
    step: {
      alignItems: 'center',
      gap: spacing.one + 2
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
