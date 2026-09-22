import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { COLORS } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/unwrap';
import { isAndroid, isIOS } from '@/utils/platform';

const projectId = () => Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

// Android delivers at the channel's importance, not the message's, so without
// MAX a feed alert lands silently in the tray. The id must match
// `defaultChannel` in the expo-notifications plugin.
const ensureAndroidChannel = async () => {
  if (!isAndroid) return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Feed alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: COLORS.light.primary
  });
};

namespace PushTokenService {
  export async function register(): Promise<string | null> {
    // Before the permission check: on Android 13+ the prompt does not appear
    // until a channel exists, and no token is issued without one.
    await ensureAndroidChannel();

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    const id = projectId();
    if (!id) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });

    // Never a table write: push_tokens grants no SELECT, which an upsert needs
    // even when nothing conflicts. The RPC derives user_id from auth.uid().
    await unwrap(
      supabase.rpc('register_push_token', {
        target_token: token,
        target_platform: isIOS ? 'ios' : 'android'
      })
    );

    return token;
  }

  // A shared phone otherwise keeps receiving a previous user's household
  // alerts, which is a privacy leak rather than noise.
  export async function remove(): Promise<void> {
    const id = projectId();
    if (!id) return;

    try {
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
      await supabase.from('push_tokens').delete().eq('token', token);
    } catch {
      // Never block sign-out on this: a stale row is cleared by the
      // DeviceNotRegistered sweep anyway.
    }
  }
}

export default PushTokenService;
