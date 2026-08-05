import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import ToggleSwitch from '@/components/core/toggle-switch';
import type { AppTheme } from '@/constants/theme';
import { useNotificationPreferences } from '@/hooks/queries/use-notification-preferences';
import { usePet } from '@/hooks/queries/use-pet';
import {
  NOTIFICATION_PERMISSION_QUERY_KEY,
  useRequestNotificationPermission
} from '@/hooks/use-notification-permission';
import { useStyles } from '@/hooks/use-styles';
import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';

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
  const { data: pet } = usePet();
  const { data: preferences, isLoading, setFeedLoggedAlerts } = useNotificationPreferences();

  const requestPermission = useRequestNotificationPermission();

  const petName = pet?.name ?? 'your pet';

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
            Turn on notifications to know the moment someone feeds {petName}.
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
      <View style={styles.section}>
        <ToggleSwitch
          label="Feed Logged Alerts"
          description={`Know when someone feeds a pet`}
          value={preferences?.feedLoggedAlerts ?? false}
          isDisabled={isDenied}
          onChange={(value) => setFeedLoggedAlerts(value)}
        />

        {isDenied && (
          <View style={styles.section}>
            <AppText size={13} color="textSecondary">
              Notifications are turned off for Crumpet, so you won&apos;t hear when someone feeds{' '}
              {petName}.
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
      </View>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}>
      {renderBody()}
    </ScrollView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background
    },
    content: {
      padding: spacing.four,
      gap: spacing.four
    },
    section: {
      gap: spacing.three
    }
  });

export default NotificationSettings;
