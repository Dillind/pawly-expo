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
import { BottomTabInset, Spacing, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useHouseholdMembers } from '@/hooks/queries/household/use-household-members';
import {
  useLeaveHousehold,
  useRemoveMember,
  useSetMemberRole
} from '@/hooks/queries/household/use-membership-mutations';
import InviteCodeSheet from '@/components/bottom-sheets/invite-code-sheet';
import { usePendingInvites, useRevokeInvite } from '@/hooks/queries/household/use-invites';
import type { PendingInvite } from '@/services/invite.service';
import { useStyles } from '@/hooks/use-styles';
import { useAuthStore } from '@/stores/auth-store';
import type { HouseholdMember, HouseholdRole } from '@/types/core';
import { fullName, roleLabel } from '@/utils/members';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, ActivityIndicator, InteractionManager, StyleSheet, View } from 'react-native';

const AVATAR_SIZE = 36;

const MembersList = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const actionsSheetRef = useRef<TrueSheet | null>(null);
  const [activeMember, setActiveMember] = useState<HouseholdMember | undefined>(undefined);
  const inviteSheetRef = useRef<TrueSheet | null>(null);
  const [activeInvite, setActiveInvite] = useState<PendingInvite | undefined>(undefined);

  const { userId } = useAuthStore();
  const { data: household } = useHousehold();
  const { data: members = [], isLoading, isError, refetch } = useHouseholdMembers();

  const householdId = household?.id;
  const isOwnerOfHousehold = household?.isOwner ?? false;
  const { mutate: setMemberRole } = useSetMemberRole(householdId);
  const { mutate: removeMember } = useRemoveMember(householdId);
  const { mutate: leaveHousehold, isPending: isLeaving } = useLeaveHousehold(householdId);
  const { data: pendingInvites = [] } = usePendingInvites(
    isOwnerOfHousehold ? householdId : undefined
  );
  const { mutate: revokeInvite } = useRevokeInvite(householdId);

  // Grouped by role, and within a group the signed-in member comes first --
  // "who am I here, and who else is" is the question this screen answers, and
  // hunting for your own row is the slow way to answer it.
  const byRole = (role: HouseholdRole) =>
    members
      .filter((member) => member.role === role)
      .sort((a, b) => {
        if (a.userId === userId) return -1;
        if (b.userId === userId) return 1;

        return (fullName(a) || '').localeCompare(fullName(b) || '');
      });

  const owners = byRole('owner');
  const contributors = byRole('contributor');

  const isOwner = household?.isOwner ?? false;
  const ownerCount = owners.length;
  // The last owner cannot leave: nobody would be left who could rename the
  // household, add a pet or invite anyone.
  const isLastOwner = isOwner && ownerCount <= 1;

  const openInvite = (invite: PendingInvite) => {
    setActiveInvite(invite);
    void inviteSheetRef.current?.present();
  };

  const confirmRevoke = (inviteId: string, email: string) => {
    Alert.alert(`Revoke the invite for ${email}?`, 'The code stops working straight away.', [
      { text: 'Cancel', style: 'cancel', isPreferred: true },
      { text: 'Revoke', style: 'destructive', onPress: () => revokeInvite(inviteId) }
    ]);
  };

  const confirmLeave = () => {
    if (isLastOwner) {
      const promotable = contributors[0];

      Alert.alert(
        'You are the only owner',
        promotable
          ? `Make someone else an owner first. Shall we start with ${fullName(promotable) || 'a contributor'}?`
          : 'Invite someone and make them an owner first, then you can leave.',
        promotable
          ? [
              { text: 'Cancel', style: 'cancel', isPreferred: true },
              {
                text: 'Choose someone',
                onPress: () => {
                  setActiveMember(promotable);
                  // A sheet raised while the alert is still dismissing gets
                  // swallowed by UIKit -- the same conflict the Popovers rule
                  // warns about.
                  InteractionManager.runAfterInteractions(() => {
                    void actionsSheetRef.current?.present();
                  });
                }
              }
            ]
          : [{ text: 'OK', style: 'cancel', isPreferred: true }]
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
        {/* No role on the row: the section heading above already says it, and
            repeating it on every line is noise. */}
        <AppText size={16} style={styles.name} numberOfLines={1}>
          {fullName(member) || 'Member'}
          {isSelf ? ' (you)' : ''}
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
        {owners.length > 0 && (
          <SettingsSection
            title={owners.length === 1 ? 'Owner' : 'Owners'}
            dividerInset={Spacing.three + AVATAR_SIZE + Spacing.three}>
            {owners.map(renderMember)}
          </SettingsSection>
        )}

        {contributors.length > 0 && (
          <SettingsSection
            title={contributors.length === 1 ? 'Contributor' : 'Contributors'}
            dividerInset={Spacing.three + AVATAR_SIZE + Spacing.three}>
            {contributors.map(renderMember)}
          </SettingsSection>
        )}

        {isOwner && pendingInvites.length > 0 && (
          <SettingsSection title="Invited">
            {pendingInvites.map((invite) => (
              <PressableOpacity
                key={invite.id}
                style={styles.row}
                accessibilityRole="button"
                accessibilityLabel={`Show the invite code for ${invite.email}`}
                onPress={() => openInvite(invite)}>
                <View style={styles.name}>
                  <AppText size={16} numberOfLines={1}>
                    {invite.email}
                  </AppText>
                  <AppText size={13} color="textSecondary">
                    {roleLabel(invite.role)} · code {invite.code}
                  </AppText>
                </View>
                <Icon name="caretRight" size={18} color="textSecondary" />
              </PressableOpacity>
            ))}
          </SettingsSection>
        )}

        {isOwner && (
          <SettingsSection>
            <SettingsRow
              icon="userPlus"
              label="Invite a member"
              onPress={() => router.push('/profile/settings/invite')}
            />
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

      <InviteCodeSheet
        sheetRef={inviteSheetRef}
        invite={activeInvite}
        householdName={household?.name ?? 'our household'}
        onRevoke={() => {
          if (activeInvite) confirmRevoke(activeInvite.id, activeInvite.email);
        }}
      />

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
