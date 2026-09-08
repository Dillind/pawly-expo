import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import OptionSheet from '@/components/bottom-sheets/option-sheet';
import RenameHouseholdSheet from '@/components/bottom-sheets/rename-household-sheet';
import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import SettingsRow from '@/components/core/settings-row';
import SettingsSection from '@/components/core/settings-section';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import HouseholdPets from '@/components/ui/household-pets';
import { SuccessMessage } from '@/constants/enums';
import { GRACE_WINDOW_OPTIONS, TIMEZONE_OPTIONS } from '@/constants/options';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useHouseholdById } from '@/hooks/queries/household/use-household-by-id';
import { useHouseholdMembers } from '@/hooks/queries/household/use-household-members';
import { useUpdateHousehold } from '@/hooks/queries/household/use-update-household';
import { useStyles } from '@/hooks/use-styles';
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

  const { data: household, isError, refetch } = useHouseholdById(householdId);
  const { data: members = [] } = useHouseholdMembers(householdId);

  const { mutate: updateTimezone } = useUpdateHousehold(
    householdId,
    SuccessMessage.TimezoneUpdated
  );
  const { mutate: updateGraceWindow } = useUpdateHousehold(
    householdId,
    SuccessMessage.GraceWindowUpdated
  );

  if (isError || !household) {
    return (
      <ScreenView edges={[]}>
        <ErrorState title="Couldn't load this household" onRetry={() => void refetch()} />
      </ScreenView>
    );
  }

  const isOwner = household.isOwner;
  const graceWindow = optionLabel(GRACE_WINDOW_OPTIONS, String(household.graceWindowMinutes));

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.identity}>
          <HouseholdPets pets={household.pets} ringColor="background" />
          <View style={styles.identityText}>
            <AppText variant="header" size={19} fontWeight="bold" numberOfLines={1}>
              {household.name}
            </AppText>
            <AppText size={13} color="textSecondary">
              {isOwner ? 'You are the Owner' : 'You are a Contributor'}
            </AppText>
          </View>
        </View>

        <View style={styles.group}>
          <SettingsSection title="People">
            <SettingsRow
              icon="users"
              label="Members"
              value={String(members.length)}
              onPress={() => router.push(`/profile/household/${householdId}/members`)}
            />
          </SettingsSection>
          <AppText size={13} color="textSecondary" style={styles.caption}>
            Roles, invites and Leave household live on the Members screen.
          </AppText>
        </View>

        <SettingsSection title="Alerts">
          <SettingsRow
            icon="bell"
            label="Notifications"
            onPress={() => router.push(`/profile/household/${householdId}/notifications`)}
          />
        </SettingsSection>

        {/* A Contributor reads the same three rows without a chevron. The feed
            timing decides when they are nudged, so hiding it explains nothing. */}
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
              value={graceWindow}
              onPress={isOwner ? () => void graceSheetRef.current?.present() : undefined}
            />
          </SettingsSection>
          {!isOwner && (
            <AppText size={13} color="textSecondary" style={styles.caption}>
              Only an Owner can change these.
            </AppText>
          )}
        </View>
      </ScreenScrollView>

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
        onSelect={(minutes) => updateGraceWindow({ graceWindowMinutes: Number(minutes) })}
      />
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingVertical: spacing.four,
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
    }
  });

export default HouseholdSettings;
