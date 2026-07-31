import { requestNotificationPermission } from '@/lib/notification-permission';
import PushTokenService from '@/services/push-token.service';
import { useAuthStore } from '@/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';

export const NOTIFICATION_PERMISSION_QUERY_KEY = ['notification-permission'];

/**
 * Raises the OS prompt and settles everything that depends on the answer.
 */
export const useRequestNotificationPermission = () => {
  const { userId } = useAuthStore();
  const queryClient = useQueryClient();

  return async () => {
    const { status } = await requestNotificationPermission();

    // PushTokenService.register is otherwise only attempted on sign-in and on
    // foreground, so a grant here would produce no token -- and no alerts --
    // until the app was next reopened.
    if (status === Notifications.PermissionStatus.GRANTED && userId) {
      await PushTokenService.register().catch((error: unknown) => {
        // Non-fatal; the next foreground retries.
        console.warn('[push] token registration failed after grant', error);
      });
    }

    await queryClient.invalidateQueries({ queryKey: NOTIFICATION_PERMISSION_QUERY_KEY });
  };
};
