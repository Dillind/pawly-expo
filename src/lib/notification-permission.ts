import * as Notifications from 'expo-notifications';

/**
 * Raises the OS permission dialog directly, with no in-app pitch in front of it.
 *
 * provideAppNotificationSettings is what puts a button inside Crumpet's own page
 * in iOS Settings that deep-links back to Manage Notifications. Without it that
 * route is unreachable from Settings.
 */
export async function requestNotificationPermission(): Promise<Notifications.NotificationPermissionsStatus> {
  return Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: false,
      provideAppNotificationSettings: true
    }
  });
}
