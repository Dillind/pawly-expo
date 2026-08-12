import MemberActionsSheet from '@/components/bottom-sheets/member-actions-sheet';
import AppText from '@/components/core/app-text';
import AvatarInitials from '@/components/core/avatar-initials';
import ErrorState from '@/components/core/error-state';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import SettingsRow from '@/components/core/settings-row';
import SettingsSection from '@/components/core/settings-section';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { ROLE_OPTIONS } from '@/constants/options';
import { BottomTabInset, Spacing, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/use-household';
import { useHouseholdMembers } from '@/hooks/queries/use-household-members';
import {
  useLeaveHousehold,
  useRemoveMember,
  useSetMemberRole
} from '@/hooks/queries/use-membership-mutations';
import { useStyles } from '@/hooks/use-styles';
import { useAuthStore } from '@/stores/auth-store';
import type { HouseholdMember } from '@/types/core';
import { fullName } from '@/utils/members';
import { optionLabel } from '@/utils/options';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef, useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, View } from 'react-native';

const AVATAR_SIZE = 36;

const MembersList = () => {
  const styles = useStyles(makeStyles);
  const actionsSheetRef = useRef<TrueSheet | null>(null);
  const [activeMember, setActiveMember] = useState<HouseholdMember | undefined>(undefined);

  const { userId } = useAuthStore();
  const { data: household } = useHousehold();
  const { data: members = [], isLoading, isError, refetch } = useHouseholdMembers();

  const householdId = household?.id;
  const { mutate: setMemberRole } = useSetMemberRole(householdId);
  const { mutate: removeMember } = useRemoveMember(householdId);
  const { mutate: leaveHousehold, isPending: isLeaving } = useLeaveHousehold(householdId);

  const isOwner = household?.isOwner ?? false;
  const ownerCount = members.filter((member) => member.role === 'owner').length;
  // The last owner cannot leave: nobody would be left who could rename the
  // household, add a pet or invite anyone.
  const isLastOwner = isOwner && ownerCount <= 1;

  const confirmLeave = () => {
    if (isLastOwner) {
      Alert.alert(
        'You are the only owner',
        'Make someone else an owner first, then you can leave.',
        [{ text: 'OK', style: 'cancel', isPreferred: true }]
      );
      return;
    }

    Alert.alert(`Leave ${household?.name ?? 'this household'}?`, 'You lose access to its pets.', [
      { text: 'Cancel', style: 'cancel', isPreferred: true },
      { text: 'Leave', style: 'destructive', onPress: () => leaveHousehold() }
    ]);
  };

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

  const renderMember = (member: HouseholdMember) => {
    const isSelf = member.userId === userId;

    const row = (
      <View style={styles.row}>
        <AvatarInitials
          firstName={member.firstName}
          lastName={member.lastName}
          size={AVATAR_SIZE}
        />
        <AppText size={16} style={styles.name} numberOfLines={1}>
          {fullName(member) || 'Member'}
          {isSelf ? ' (you)' : ''}
        </AppText>
        <AppText size={14} color="textSecondary">
          {optionLabel(ROLE_OPTIONS, member.role)}
        </AppText>

        {isOwner && !isSelf && <Icon name="caretRight" size={16} color="textSecondary" />}
      </View>
    );

    // Only an owner acts on someone else. Acting on yourself is leaving, which
    // is its own row below.
    if (!isOwner || isSelf) return <View key={member.userId}>{row}</View>;

    return (
      <PressableOpacity
        key={member.userId}
        accessibilityRole="button"
        accessibilityLabel={`Manage ${fullName(member) || 'member'}`}
        onPress={() => {
          setActiveMember(member);
          void actionsSheetRef.current?.present();
        }}>
        {row}
      </PressableOpacity>
    );
  };

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <SettingsSection dividerInset={Spacing.three + AVATAR_SIZE + Spacing.three}>
          {members.map(renderMember)}
        </SettingsSection>

        {isOwner && (
          <SettingsSection>
            <SettingsRow icon="userPlus" label="Invite a member" isSoon />
          </SettingsSection>
        )}

        <SettingsSection>
          <SettingsRow
            icon="logOut"
            label="Leave household"
            variant="destructive"
            isDisabled={isLeaving}
            onPress={confirmLeave}
          />
        </SettingsSection>
      </ScreenScrollView>

      <MemberActionsSheet
        sheetRef={actionsSheetRef}
        member={activeMember}
        onSetRole={(role) => {
          if (activeMember) setMemberRole({ userId: activeMember.userId, role });
        }}
        onRemove={() => {
          if (activeMember) removeMember(activeMember.userId);
        }}
      />
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
