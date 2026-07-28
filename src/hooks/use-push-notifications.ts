import * as Notifications from 'expo-notifications';
import { RelativePathString, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useHousehold } from '@/hooks/use-household';
import PushTokenService from '@/services/push-token.service';
import { useAuthStore } from '@/stores/auth-store';

// shouldShowAlert is deprecated in SDK 57, and setting it alongside
// shouldShowBanner: false / shouldShowList: false is why a foregrounded
// notification previously displayed NOTHING.
//
// Badges stay off in this pass: a badge count implies an inbox to clear, and
// there isn't one yet.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

/**
 * Mounted once, inside AuthGate in src/app/_layout.tsx -- the one place where
 * a userId exists and the router is already mounted.
 */
export const usePushNotifications = () => {
  const router = useRouter();
  const { status, userId } = useAuthStore();
  const { data: household } = useHousehold();

  const handledResponseId = useRef<string | null>(null);

  // addNotificationResponseReceivedListener alone is NOT reliable for a tap
  // that launches the app from terminated -- the listener attaches after the
  // response has already been delivered. useLastNotificationResponse replays
  // it. Deduplicating on the request identifier is what makes replay safe, and
  // it removes the old isNavigatingRef setTimeout(..., 1000) hack.
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (status !== 'signedIn' || !userId) return;

    const attempt = () => {
      void PushTokenService.register(userId).catch(() => {
        // Non-fatal. A user without a token simply receives nothing; the app
        // is fully usable, and the next foreground tries again.
      });
    };

    attempt();

    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') attempt();
    });

    return () => subscription.remove();
  }, [status, userId]);

  useEffect(() => {
    if (!lastResponse) return;

    // A cold-start tap must not try to push /activity at the auth stack, and
    // must not race the household query the destination screen depends on.
    if (status !== 'signedIn' || !household) return;

    const identifier = lastResponse.notification.request.identifier;
    if (handledResponseId.current === identifier) return;
    handledResponseId.current = identifier;

    const data = lastResponse.notification.request.content.data;
    if (!data?.screen) return;

    router.push({
      pathname: data.screen as RelativePathString,
      params: data.params as Record<string, string>
    });
  }, [lastResponse, status, household, router]);
};
