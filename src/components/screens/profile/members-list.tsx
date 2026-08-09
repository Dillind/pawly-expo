import AppText from '@/components/core/app-text';
import AvatarInitials from '@/components/core/avatar-initials';
import ErrorState from '@/components/core/error-state';
import SettingsRow from '@/components/core/settings-row';
import SettingsSection from '@/components/core/settings-section';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { BottomTabInset, Radius, type AppTheme } from '@/constants/theme';
import { useHouseholdMembers } from '@/hooks/queries/use-household-members';
import { useStyles } from '@/hooks/use-styles';
import type { HouseholdMember } from '@/types/core';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const memberName = (member: HouseholdMember) =>
  [member.firstName, member.lastName].filter(Boolean).join(' ') || 'Member';

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
        <View style={styles.card}>
          {members.map((member, index) => (
            <View key={member.userId}>
              {index > 0 && <View style={styles.divider} />}
              <View style={styles.row}>
                <AvatarInitials firstName={member.firstName} lastName={member.lastName} size={36} />
                <AppText size={16} style={styles.name} numberOfLines={1}>
                  {memberName(member)}
                </AppText>
                <AppText size={14} color="textSecondary">
                  {member.role === 'owner' ? 'Owner' : 'Contributor'}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        <SettingsSection>
          <SettingsRow icon="userPlus" label="Invite a member" isSoon />
          <SettingsRow icon="close" label="Remove a member" isSoon />
        </SettingsSection>
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    loading: {
      paddingTop: spacing.five
    },
    content: {
      paddingVertical: spacing.four,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.four
    },
    card: {
      backgroundColor: colors.backgroundElement,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      paddingVertical: spacing.one,
      overflow: 'hidden'
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
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.background,
      marginLeft: spacing.three + 36 + spacing.three
    }
  });

export default MembersList;
