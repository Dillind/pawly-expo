import AboutSheet from '@/components/bottom-sheets/about-sheet';
import AppearanceSheet from '@/components/bottom-sheets/appearance-sheet';
import AppText from '@/components/core/app-text';
import SettingsRow from '@/components/core/settings-row';
import SettingsSection from '@/components/core/settings-section';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { ErrorMessage } from '@/constants/enums';
import { APPEARANCE_OPTIONS } from '@/constants/options';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/use-household';
import { useHouseholdMembers } from '@/hooks/queries/use-household-members';
import { useLogout } from '@/hooks/use-logout';
import { useStyles } from '@/hooks/use-styles';
import { APP_VERSION, supportMailtoForUser } from '@/lib/support';
import { showErrorToast } from '@/lib/toast';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { openExternalURL } from '@/utils/linking';
import { optionLabel } from '@/utils/options';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

const SettingsList = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const appearanceSheetRef = useRef<TrueSheet | null>(null);
  const aboutSheetRef = useRef<TrueSheet | null>(null);

  const { preference } = useThemeStore();
  const { logout, isLoading: isSigningOut } = useLogout();
  const { userId } = useAuthStore();
  const { data: household } = useHousehold();
  const { data: members = [] } = useHouseholdMembers();

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
          <SettingsRow
            icon="bell"
            label="Notifications"
            onPress={() => router.push('/profile/settings/notifications')}
          />
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

        {household?.isOwner && (
          <SettingsSection title="Household">
            <SettingsRow icon="house" label="Household name" isSoon />
            <SettingsRow
              icon="users"
              label="Members"
              value={String(members.length)}
              onPress={() => router.push('/profile/settings/members')}
            />
            <SettingsRow icon="userPlus" label="Invite a member" isSoon />
            <SettingsRow icon="globe" label="Timezone" isSoon />
            <SettingsRow icon="hourglass" label="Feed timing" isSoon />
          </SettingsSection>
        )}

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
