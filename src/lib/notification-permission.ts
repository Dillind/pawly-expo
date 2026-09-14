import * as Notifications from 'expo-notifications';

// provideAppNotificationSettings puts a button inside Crumpet's own page in iOS
// Settings that deep-links back to Manage Notifications. Without it that route
// is unreachable.
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
