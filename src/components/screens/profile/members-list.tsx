import AppText from '@/components/core/app-text';
import AvatarInitials from '@/components/core/avatar-initials';
import ErrorState from '@/components/core/error-state';
import SettingsRow from '@/components/core/settings-row';
import SettingsSection from '@/components/core/settings-section';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { ROLE_OPTIONS } from '@/constants/options';
import { BottomTabInset, Spacing, type AppTheme } from '@/constants/theme';
import { useHouseholdMembers } from '@/hooks/queries/use-household-members';
import { useStyles } from '@/hooks/use-styles';
import { fullName } from '@/utils/members';
import { optionLabel } from '@/utils/options';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const AVATAR_SIZE = 36;

const MembersList = () => {
  const styles = useStyles(makeStyles);
  const { data: members = [], isLoading, isError, refetch } = useHouseholdMembers();

  if (isLoading) {
    return (
      <ScreenView edges={[]}>
        <ActivityIndicator style={styles.loading} />
      </ScreenView>
    );
  }

  if (isError) {
    return (
      <ScreenView edges={[]}>
        <ErrorState title="Couldn't load members" onRetry={() => void refetch()} />
      </ScreenView>
    );
  }

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <SettingsSection dividerInset={Spacing.three + AVATAR_SIZE + Spacing.three}>
          {members.map((member) => (
            <View key={member.userId} style={styles.row}>
              <AvatarInitials
                firstName={member.firstName}
                lastName={member.lastName}
                size={AVATAR_SIZE}
              />
              <AppText size={16} style={styles.name} numberOfLines={1}>
                {fullName(member) || 'Member'}
              </AppText>
              <AppText size={14} color="textSecondary">
                {optionLabel(ROLE_OPTIONS, member.role)}
              </AppText>
            </View>
          ))}
        </SettingsSection>

        <SettingsSection>
          <SettingsRow icon="userPlus" label="Invite a member" isSoon />
          <SettingsRow icon="close" label="Remove a member" isSoon />
        </SettingsSection>
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    loading: {
      paddingTop: spacing.five
    },
    content: {
      paddingVertical: spacing.four,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.four
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      minHeight: 56,
      paddingHorizontal: spacing.three
    },
    name: {
      flex: 1
    }
  });

export default MembersList;
