import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import AboutSheet from '@/components/bottom-sheets/about-sheet';
import AppearanceSheet from '@/components/bottom-sheets/appearance-sheet';
import OptionSheet from '@/components/bottom-sheets/option-sheet';
import RenameHouseholdSheet from '@/components/bottom-sheets/rename-household-sheet';
import AppText from '@/components/core/app-text';
import SettingsRow from '@/components/core/settings-row';
import SettingsSection from '@/components/core/settings-section';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { APPEARANCE_OPTIONS, GRACE_WINDOW_OPTIONS, TIMEZONE_OPTIONS } from '@/constants/options';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useHouseholdMembers } from '@/hooks/queries/household/use-household-members';
import { useUpdateHousehold } from '@/hooks/queries/household/use-update-household';
import { useLogout } from '@/hooks/use-logout';
import { useStyles } from '@/hooks/use-styles';
import { APP_VERSION, supportMailtoForUser } from '@/lib/support';
import { showErrorToast } from '@/lib/toast';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { openExternalURL } from '@/utils/linking';
import { optionLabel } from '@/utils/options';

const SettingsList = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const appearanceSheetRef = useRef<TrueSheet | null>(null);
  const aboutSheetRef = useRef<TrueSheet | null>(null);
  const renameSheetRef = useRef<TrueSheet | null>(null);
  const timezoneSheetRef = useRef<TrueSheet | null>(null);
  const graceSheetRef = useRef<TrueSheet | null>(null);

  const { preference } = useThemeStore();
  const { logout, isLoading: isSigningOut } = useLogout();
  const { userId } = useAuthStore();
  const { data: household } = useHousehold();
  const { data: members = [] } = useHouseholdMembers();

  const { mutate: updateTimezone } = useUpdateHousehold(
    household?.id,
    SuccessMessage.TimezoneUpdated
  );
  const { mutate: updateGraceWindow } = useUpdateHousehold(
    household?.id,
    SuccessMessage.GraceWindowUpdated
  );

  const handleContactSupport = async () => {
    const opened = await openExternalURL(supportMailtoForUser(userId));
    if (!opened) showErrorToast(ErrorMessage.SupportEmailUnavailable);
  };

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <SettingsSection title="Account">
          <SettingsRow
            icon="lock"
            label="Account"
            onPress={() => router.push('/profile/settings/account')}
          />
          <SettingsRow icon="creditCard" label="Manage Subscription" isSoon />
        </SettingsSection>

        <SettingsSection title="Preferences">
          <SettingsRow
            icon="sunMoon"
            label="Appearance"
            value={optionLabel(APPEARANCE_OPTIONS, preference)}
            onPress={() => void appearanceSheetRef.current?.present()}
          />
          <SettingsRow icon="sparkles" label="App Icon" isSoon />
        </SettingsSection>

        {/* Household-scoped, and labelled with the household, because these
            settings apply to this one alone -- notifications especially. A
            member of four households has four sets of these. */}
        <SettingsSection title={household?.name ?? 'Household'}>
          <SettingsRow
            icon="bell"
            label="Notifications"
            onPress={() => router.push('/profile/settings/notifications')}
          />
          <SettingsRow
            icon="users"
            label="Members"
            value={String(members.length)}
            onPress={() => router.push('/profile/settings/members')}
          />

          {household?.isOwner && (
            <>
              <SettingsRow
                icon="house"
                label="Household name"
                value={household.name}
                onPress={() => void renameSheetRef.current?.present()}
              />
              <SettingsRow
                icon="globe"
                label="Timezone"
                value={household.timezone}
                onPress={() => void timezoneSheetRef.current?.present()}
              />
              <SettingsRow
                icon="hourglass"
                label="Feed timing"
                value={optionLabel(GRACE_WINDOW_OPTIONS, String(household.graceWindowMinutes))}
                onPress={() => void graceSheetRef.current?.present()}
              />
            </>
          )}
        </SettingsSection>

        <SettingsSection title="Help & Support">
          <SettingsRow
            icon="mail"
            label="Contact Support"
            onPress={() => void handleContactSupport()}
          />
          <SettingsRow icon="lightbulb" label="Request a feature" isSoon />
          <SettingsRow icon="star" label="Rate Crumpet" isSoon />
          <SettingsRow
            icon="info"
            label="About"
            onPress={() => void aboutSheetRef.current?.present()}
          />
        </SettingsSection>

        <View style={styles.signOut}>
          <SettingsSection>
            <SettingsRow
              icon="logOut"
              label="Sign out"
              variant="destructive"
              isDisabled={isSigningOut}
              onPress={() => void logout()}
            />
          </SettingsSection>
        </View>

        <AppText size={12} color="textSecondary" align="center">
          Version {APP_VERSION}
        </AppText>
      </ScreenScrollView>

      <AppearanceSheet sheetRef={appearanceSheetRef} />
      <AboutSheet sheetRef={aboutSheetRef} />

      <RenameHouseholdSheet
        sheetRef={renameSheetRef}
        householdId={household?.id}
        name={household?.name ?? ''}
      />
      <OptionSheet
        sheetRef={timezoneSheetRef}
        title="Timezone"
        options={TIMEZONE_OPTIONS}
        selected={household?.timezone}
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
        selected={household ? String(household.graceWindowMinutes) : undefined}
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
    signOut: {
      paddingTop: spacing.two
    }
  });

export default SettingsList;
