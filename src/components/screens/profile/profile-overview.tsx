import AppText from '@/components/core/app-text';
import AvatarInitials from '@/components/core/avatar-initials';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { ROLE_OPTIONS } from '@/constants/options';
import { BottomTabInset, Radius, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/use-household';
import { useHouseholdMembers } from '@/hooks/queries/use-household-members';
import { useSessionEmail } from '@/hooks/queries/use-session-email';
import { useUserProfile } from '@/hooks/queries/use-user-profile';
import { useStyles } from '@/hooks/use-styles';
import { fullName } from '@/utils/members';
import { optionLabel } from '@/utils/options';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

const ProfileOverview = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: profile } = useUserProfile();
  const { data: email } = useSessionEmail();
  const { data: household } = useHousehold();
  const { data: members = [] } = useHouseholdMembers();

  const name = fullName(profile);

  return (
    <ScreenView>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="always">
        <View style={styles.header}>
          <AppText variant="header" size={32}>
            Profile
          </AppText>
          <IconButton
            name="settings"
            accessibilityLabel="Settings"
            variant="glass"
            size={22}
            onPress={() => router.push('/profile/settings')}
          />
        </View>

        <View style={styles.identity}>
          <AvatarInitials firstName={profile?.firstName} lastName={profile?.lastName} />
          <AppText variant="header" size={22}>
            {name || 'Your profile'}
          </AppText>
          {email && (
            <AppText size={14} color="textSecondary">
              {email}
            </AppText>
          )}
          {household && (
            <View style={styles.rolePill}>
              <AppText size={12} color="primary">
                {optionLabel(ROLE_OPTIONS, household.role)}
              </AppText>
            </View>
          )}
        </View>

        {household && (
          <View style={styles.householdCard}>
            <Icon name="house" size={18} color="textSecondary" />
            <AppText size={16} numberOfLines={1} style={styles.householdName}>
              {household.name}
            </AppText>
            <AppText size={14} color="textSecondary">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </AppText>
          </View>
        )}
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.four
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    identity: {
      alignItems: 'center',
      gap: spacing.two
    },
    rolePill: {
      paddingHorizontal: spacing.two,
      paddingVertical: spacing.half,
      borderRadius: Radius.full,
      backgroundColor: colors.primaryMuted
    },
    householdCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      padding: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    householdName: {
      flex: 1
    }
  });

export default ProfileOverview;
