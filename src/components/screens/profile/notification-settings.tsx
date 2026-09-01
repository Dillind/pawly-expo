import OptionSheet from '@/components/bottom-sheets/option-sheet';
import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import SettingsRow from '@/components/core/settings-row';
import SettingsSection from '@/components/core/settings-section';
import ToggleSwitch from '@/components/core/toggle-switch';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { DEFAULT_LEAD_MINUTES, FEED_DUE_LEAD_OPTIONS } from '@/constants/options';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useNotificationPreferences } from '@/hooks/queries/household/use-notification-preferences';
import {
  NOTIFICATION_PERMISSION_QUERY_KEY,
  useRequestNotificationPermission
} from '@/hooks/use-notification-permission';
import { useStyles } from '@/hooks/use-styles';
import { optionLabel } from '@/utils/options';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRef } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

/**
 * What the household will and won't send this member.
 *
 * The screen is driven by the OS permission first and the stored preference
 * second, because that is the real order of authority: a toggle reading "on"
 * while iOS silently drops every push is the app lying about its own state.
 * When permission is denied the toggle is rendered disabled rather than hidden
 * -- hiding it would leave no explanation for why nothing arrives.
 */
const NotificationSettings = () => {
  const styles = useStyles(makeStyles);
  const { data: household } = useHousehold();
  const {
    data: preferences,
    isLoading,
    setPreference,
    setLeadMinutes
  } = useNotificationPreferences(household?.id);

  const leadSheetRef = useRef<TrueSheet | null>(null);

  const requestPermission = useRequestNotificationPermission();

  // The OS permission is read through Query rather than useState + an AppState
  // listener so it re-reads on foreground for free: the root layout already
  // wires AppState into TanStack's focusManager, and this query is stale
  // immediately. That matters here more than anywhere else in the app --
  // this screen is the one people leave for Settings and come straight back to.
  const { data: permission } = useQuery({
    queryKey: NOTIFICATION_PERMISSION_QUERY_KEY,
    queryFn: () => Notifications.getPermissionsAsync()
  });

  const renderBody = () => {
    if (!permission || isLoading) return <ActivityIndicator />;

    if (permission.status === Notifications.PermissionStatus.UNDETERMINED) {
      return (
        <View style={styles.section}>
          <AppText size={14} color="textSecondary">
            Turn on notifications to know before a feed is due, and the moment someone feeds a pet
            or shares a photo.
          </AppText>
          <MainButton
            text="Turn on notifications"
            onPress={() => {
              void requestPermission();
            }}
          />
        </View>
      );
    }

    const isDenied = permission.status !== Notifications.PermissionStatus.GRANTED;

    return (
      <>
        {/* These are stored per membership, so they apply to this household
            alone. Naming it is the only thing stopping a member of several
            believing they have just silenced all of them. */}
        {household && (
          <AppText size={14} color="textSecondary">
            What {household.name} will and won&apos;t send you. Each household you belong to has its
            own settings.
          </AppText>
        )}

        <SettingsSection title="Feeds">
          <View style={styles.toggleRow}>
            <ToggleSwitch
              label="Feed Due Alerts"
              description="Know before a feed is due"
              value={preferences?.feedDueAlerts ?? false}
              isDisabled={isDenied}
              onChange={(value) => setPreference({ preference: 'feedDueAlerts', value })}
            />
          </View>

          {/* Off is the member's own choice, so hiding this is one control
              saying one thing. Denied is not, so the row stays and greys out. */}
          {(preferences?.feedDueAlerts || isDenied) && (
            <SettingsRow
              icon="clock"
              label="Nudge me before"
              value={optionLabel(
                FEED_DUE_LEAD_OPTIONS,
                preferences?.feedDueLeadMinutes ?? DEFAULT_LEAD_MINUTES
              )}
              isDisabled={isDenied}
              onPress={() => void leadSheetRef.current?.present()}
            />
          )}

          <View style={styles.toggleRow}>
            <ToggleSwitch
              label="Missed Feed Alerts"
              description="Know when a feed goes unlogged"
              value={preferences?.missedFeedAlerts ?? false}
              isDisabled={isDenied}
              onChange={(value) => setPreference({ preference: 'missedFeedAlerts', value })}
            />
          </View>

          <View style={styles.toggleRow}>
            <ToggleSwitch
              label="Feed Logged Alerts"
              description="Know when someone feeds a pet"
              value={preferences?.feedLoggedAlerts ?? false}
              isDisabled={isDenied}
              onChange={(value) => setPreference({ preference: 'feedLoggedAlerts', value })}
            />
          </View>
        </SettingsSection>

        <SettingsSection title="Reminders">
          <View style={styles.toggleRow}>
            <ToggleSwitch
              label="Reminder Alerts"
              description="Know before a worming tablet or a vet visit is due"
              value={preferences?.reminderAlerts ?? false}
              isDisabled={isDenied}
              onChange={(value) => setPreference({ preference: 'reminderAlerts', value })}
            />
          </View>
        </SettingsSection>

        <SettingsSection title="Posts">
          <View style={styles.toggleRow}>
            <ToggleSwitch
              label="Post Alerts"
              description="Know when someone shares a photo"
              value={preferences?.postAlerts ?? false}
              isDisabled={isDenied}
              onChange={(value) => setPreference({ preference: 'postAlerts', value })}
            />
          </View>
        </SettingsSection>

        {isDenied && (
          <View style={styles.section}>
            <AppText size={13} color="textSecondary">
              Notifications are turned off for Crumpet, so you won&apos;t hear when a feed is coming
              up, when someone feeds a pet, or when someone shares a photo.
            </AppText>
            <MainButton
              text="Open Settings"
              variant="secondary"
              onPress={() => {
                void Linking.openSettings();
              }}
            />
          </View>
        )}
      </>
    );
  };

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        {renderBody()}
      </ScreenScrollView>

      <OptionSheet
        sheetRef={leadSheetRef}
        title="Nudge me before"
        options={FEED_DUE_LEAD_OPTIONS}
        selected={preferences?.feedDueLeadMinutes}
        onSelect={setLeadMinutes}
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
    section: {
      gap: spacing.three
    },
    toggleRow: {
      paddingHorizontal: spacing.three,
      paddingVertical: spacing.two
    }
  });

export default NotificationSettings;
