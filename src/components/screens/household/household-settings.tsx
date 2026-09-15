import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter } from 'expo-router';
import { useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import OptionSheet from '@/components/bottom-sheets/option-sheet';
import RenameHouseholdSheet from '@/components/bottom-sheets/rename-household-sheet';
import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import SettingsRow from '@/components/core/settings-row';
import SettingsSection from '@/components/core/settings-section';
import ToggleSwitch from '@/components/core/toggle-switch';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import HouseholdPets from '@/components/ui/household-pets';
import { SuccessMessage } from '@/constants/enums';
import { followLink } from '@/constants/follow-link';
import { GRACE_WINDOW_OPTIONS, TIMEZONE_OPTIONS } from '@/constants/options';
import { BottomTabInset, HeaderTitleStyle, type AppTheme } from '@/constants/theme';
import { useFollowers, useFollowRequests } from '@/hooks/queries/follow/use-follows';
import { useHouseholdById } from '@/hooks/queries/household/use-household-by-id';
import { useHouseholdMembers } from '@/hooks/queries/household/use-household-members';
import { useSetHouseholdListed } from '@/hooks/queries/household/use-set-household-listed';
import { useUpdateHousehold } from '@/hooks/queries/household/use-update-household';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import { showSuccessToast } from '@/lib/toast';
import { optionLabel } from '@/utils/options';

type Props = {
  householdId: string;
};

const HouseholdSettings = ({ householdId }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const renameSheetRef = useRef<TrueSheet | null>(null);
  const timezoneSheetRef = useRef<TrueSheet | null>(null);
  const graceSheetRef = useRef<TrueSheet | null>(null);

  const {
    data: household,
    isLoading,
    isError,
    isNotFound,
    refetch
  } = useHouseholdById(householdId);
  const { data: members = [] } = useHouseholdMembers(householdId);
  const { data: followers = [] } = useFollowers(householdId);
  const { data: followRequests = [] } = useFollowRequests(householdId);

  const { mutate: updateTimezone } = useUpdateHousehold(
    householdId,
    SuccessMessage.TimezoneUpdated
  );
  const { mutate: updateGraceWindow } = useUpdateHousehold(
    householdId,
    SuccessMessage.GraceWindowUpdated
  );

  const { mutate: setListed, isPending: isSettingListed } = useSetHouseholdListed(householdId);

  const isOwner = household?.isOwner ?? false;
  const role = isOwner ? 'Owner' : 'Contributor';

  // Owner only, because a Contributor cannot accept the follower it brings.
  const copyFollowLink = () => {
    hapticLight();
    void Clipboard.setStringAsync(followLink(householdId));
    showSuccessToast(SuccessMessage.FollowLinkCopied);
  };

  // A bare switch cannot say that Listing governs discovery, never access.
  const listedDescription = !household?.handle
    ? 'Set a handle first'
    : household.isListed
      ? 'Anyone can find your household by name or handle.'
      : 'Only people with your follow link can find you.';

  const renderBody = () => {
    if (isLoading) return <ActivityIndicator style={styles.loading} />;

    // Not a failed request, so an ErrorState's retry would never succeed.
    if (isNotFound) {
      return (
        <ErrorState
          title="You are no longer in this household"
          description="Go back to Home to see the households you are in."
        />
      );
    }

    if (isError || !household) {
      return <ErrorState title="Couldn't load this household" onRetry={() => void refetch()} />;
    }

    return (
      <>
        <View style={styles.identity}>
          <HouseholdPets pets={household.pets} ringColor="background" />
          <View style={styles.identityText}>
            <AppText variant="header" size={24} fontWeight="bold" numberOfLines={1}>
              {household.name}
            </AppText>
            <AppText size={13} color="textSecondary" numberOfLines={1}>
              You are the {role}
              {household.handle ? `  ·  @${household.handle}` : ''}
            </AppText>
          </View>
        </View>

        <View style={styles.group}>
          <SettingsSection title="People">
            <SettingsRow
              icon="users"
              label="Members"
              value={String(members.length)}
              onPress={() => router.push(`/home/household/${householdId}/members`)}
            />
            {/* Owner only: the select policy on household_follows is
                owner-or-self, so a Contributor reads no rows: they would see a
                count of nothing and open a screen with nothing on it. Who
                watches is the Owner's decision, and so is the list of them.

                A waiting request is the only number worth the row, so it wins
                the value slot when there is one. */}
            {isOwner && (
              <SettingsRow
                icon="userPlus"
                label="Followers"
                value={
                  followRequests.length > 0
                    ? `${followRequests.length} waiting`
                    : String(followers.length)
                }
                onPress={() => router.push(`/home/household/${householdId}/followers`)}
              />
            )}
          </SettingsSection>
          <AppText size={13} color="textSecondary" style={styles.caption}>
            Roles, invites and Leave household live on the Members screen.
          </AppText>
        </View>

        {/* Between People and Household, so the sections run from the people
            already inside, to the people outside, to the settings that are
            nobody else's business. */}
        <View style={styles.group}>
          <SettingsSection title="Discovery">
            <SettingsRow
              icon="atSign"
              label="Handle"
              value={household.handle ? `@${household.handle}` : 'Not set'}
              onPress={
                isOwner ? () => router.push(`/home/household/${householdId}/handle`) : undefined
              }
            />
            {/* ToggleSwitch brings no padding of its own; its only other
                caller supplies it from outside -- so the row gutter is set
                here rather than by the component. */}
            <View style={styles.toggleRow}>
              {/* isBusy, not isDisabled: two quick taps are two
                  writes with no ordering between them, so the one that commits
                  last decides -- and that can be the earlier tap. Refusing the
                  second tap is what stops it. Dimming the row instead would
                  flash grey on every toggle. */}
              <ToggleSwitch
                label="Listed"
                description={listedDescription}
                value={household.isListed}
                isDisabled={!isOwner || !household.handle}
                isBusy={isSettingListed}
                onChange={setListed}
              />
            </View>
          </SettingsSection>
          <AppText size={13} color="textSecondary" style={styles.caption}>
            You accept every follower, listed or not.
          </AppText>
        </View>

        <View style={styles.group}>
          <SettingsSection title="Alerts">
            <SettingsRow
              icon="bell"
              label="Notifications"
              onPress={() => router.push(`/home/household/${householdId}/notifications`)}
            />
          </SettingsSection>
          <AppText size={13} color="textSecondary" style={styles.caption}>
            A follow request tells you here. Followers never get a notification of their own.
          </AppText>
        </View>

        <View style={styles.group}>
          <SettingsSection title="Household">
            <SettingsRow
              icon="house"
              label="Name"
              value={household.name}
              onPress={isOwner ? () => void renameSheetRef.current?.present() : undefined}
            />
            <SettingsRow
              icon="globe"
              label="Timezone"
              value={household.timezone}
              onPress={isOwner ? () => void timezoneSheetRef.current?.present() : undefined}
            />
            <SettingsRow
              icon="hourglass"
              label="Feed timing"
              value={optionLabel(GRACE_WINDOW_OPTIONS, String(household.graceWindowMinutes))}
              onPress={isOwner ? () => void graceSheetRef.current?.present() : undefined}
            />
          </SettingsSection>
          {!isOwner && (
            <AppText size={13} color="textSecondary" style={styles.caption}>
              Only an Owner can change these.
            </AppText>
          )}
        </View>
      </>
    );
  };

  return (
    <ScreenView edges={[]}>
      {/* Outside every early return: behind one the bar has no title and falls
          back to the route name. */}
      <Stack.Title style={HeaderTitleStyle}>Household</Stack.Title>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="square.and.arrow.up"
          accessibilityLabel="Copy the follow link"
          hidden={!isOwner}
          onPress={copyFollowLink}
        />

        <Stack.Toolbar.Menu
          accessibilityLabel="Manage this household"
          icon="ellipsis"
          hidden={!isOwner}>
          <Stack.Toolbar.MenuAction
            icon="trash"
            destructive
            onPress={() => router.push(`/home/household/${householdId}/delete`)}>
            Delete household
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        {renderBody()}
      </ScreenScrollView>

      {household && isOwner && (
        <>
          <RenameHouseholdSheet
            sheetRef={renameSheetRef}
            householdId={householdId}
            name={household.name}
          />
          <OptionSheet
            sheetRef={timezoneSheetRef}
            title="Timezone"
            options={TIMEZONE_OPTIONS}
            selected={household.timezone}
            isScrollable
            onSelect={(timezone) =>
              updateTimezone(
                { timezone },
                { onSuccess: () => void timezoneSheetRef.current?.dismiss() }
              )
            }
          />
          <OptionSheet
            sheetRef={graceSheetRef}
            title="Feed timing"
            options={GRACE_WINDOW_OPTIONS}
            selected={String(household.graceWindowMinutes)}
            onSelect={(minutes) =>
              updateGraceWindow(
                { graceWindowMinutes: Number(minutes) },
                { onSuccess: () => void graceSheetRef.current?.dismiss() }
              )
            }
          />
        </>
      )}
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.four
    },
    identity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three
    },
    identityText: {
      flex: 1,
      gap: spacing.half
    },
    group: {
      gap: spacing.two
    },
    caption: {
      paddingHorizontal: spacing.one
    },
    toggleRow: {
      paddingHorizontal: spacing.three,
      paddingVertical: spacing.two + spacing.one
    },
    loading: {
      marginTop: spacing.five
    }
  });

export default HouseholdSettings;
