import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import AboutSheet from '@/components/bottom-sheets/about-sheet';
import AppearanceSheet from '@/components/bottom-sheets/appearance-sheet';
import AppText from '@/components/core/app-text';
import SettingsRow from '@/components/core/settings-row';
import SettingsSection from '@/components/core/settings-section';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import HouseholdRow, { HOUSEHOLD_ROW_DIVIDER_INSET } from '@/components/ui/household-row';
import { ErrorMessage } from '@/constants/enums';
import { APPEARANCE_OPTIONS } from '@/constants/options';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useHouseholds } from '@/hooks/queries/household/use-households';
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

  const { preference } = useThemeStore();
  const { logout, isLoading: isSigningOut } = useLogout();
  const { userId } = useAuthStore();
  const { data: households = [] } = useHouseholds();

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

        {/* One row per household, because these settings belong to one alone.
            A single row for the active household is what made a member of
            several believe she had silenced all of them. */}
        {households.length > 0 && (
          <View style={styles.group}>
            <SettingsSection title="Your households" dividerInset={HOUSEHOLD_ROW_DIVIDER_INSET}>
              {households.map((household) => (
                <HouseholdRow key={household.id} household={household} />
              ))}
            </SettingsSection>
            <AppText size={13} color="textSecondary" style={styles.caption}>
              Notifications, members and feed timing live inside the household they belong to.
            </AppText>
          </View>
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
    },
    group: {
      gap: spacing.two
    },
    caption: {
      paddingHorizontal: spacing.one
    }
  });

export default SettingsList;
