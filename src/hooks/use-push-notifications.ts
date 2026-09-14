import * as Notifications from 'expo-notifications';
import { RelativePathString, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useHousehold } from '@/hooks/queries/household/use-household';
import { useHouseholds } from '@/hooks/queries/household/use-households';
import PushTokenService from '@/services/push-token.service';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import { useAuthStore } from '@/stores/auth-store';

// shouldShowAlert is deprecated in SDK 57. Set alongside shouldShowBanner and
// shouldShowList as false, a foregrounded notification displays nothing.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

// Mounted once, inside AuthGate: the one place where a userId exists and the
// router is already mounted.
export const usePushNotifications = () => {
  const router = useRouter();
  const { status, userId } = useAuthStore();
  const { data: household } = useHousehold();
  const { data: households = [] } = useHouseholds();
  const { setActiveHousehold } = useActiveHouseholdStore();

  const handledResponseId = useRef<string | null>(null);

  // A response listener attaches after a cold-start tap is already delivered,
  // so useLastNotificationResponse replays it. Deduplicating on the request
  // identifier is what makes the replay safe.
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (status !== 'signedIn' || !userId) return;

    const attempt = () => {
      void PushTokenService.register().catch((error: unknown) => {
        // Logged, never dropped: a silent catch here once hid a 403 that made
        // the whole feature dead with no error to work from.
        console.warn('[push] token registration failed', error);
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

    // A cold-start tap must not push /home at the auth stack, nor race the
    // household query the destination screen depends on.
    if (status !== 'signedIn' || !household) return;

    const identifier = lastResponse.notification.request.identifier;
    if (handledResponseId.current === identifier) return;
    handledResponseId.current = identifier;

    const data = lastResponse.notification.request.content.data;
    if (!data?.screen) return;

    // A notification delivered before the route was renamed carries the old
    // path and sits on the phone until tapped.
    const screen = (data.screen as string).replace(/^\/household/, '/posts');

    const navigate = () =>
      router.navigate({
        pathname: screen as RelativePathString,
        params: data.params as Record<string, string>
      });

    // Switch first, or the tap lands on the right screen with the wrong pets.
    const targetId = data.householdId as string | undefined;

    if (!targetId) return navigate();

    // Left or removed: there is no household to switch to, so do nothing.
    if (!households.some((candidate) => candidate.id === targetId)) return;

    if (targetId === household.id) return navigate();

    void setActiveHousehold(targetId).then(navigate);
  }, [lastResponse, status, household, households, setActiveHousehold, router]);
};
