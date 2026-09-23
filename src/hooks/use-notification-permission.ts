import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';

import { logError } from '@/lib/errors';
import { requestNotificationPermission } from '@/lib/notification-permission';
import { queryKeys } from '@/lib/query-keys';
import PushTokenService from '@/services/push-token.service';
import { useAuthStore } from '@/stores/auth-store';

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
        logError(error);
      });
    }

    await queryClient.invalidateQueries({ queryKey: queryKeys.notificationPermission });
  };
};
