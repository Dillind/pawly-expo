import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { COLORS } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';
import { isAndroid, isIOS } from '@/utils/platform';

const projectId = () => Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

/**
 * Android delivers a notification at its channel's importance, not the
 * message's, so without a channel at MAX a feed alert arrives silently in the
 * tray instead of as a heads-up banner. The channel id must match
 * `defaultChannel` in the expo-notifications plugin, which is what routes
 * FCMv1 messages to it.
 *
 * Creating it is also a precondition, not a nicety: on Android 13+ the
 * permission prompt does not appear until a channel exists, and the channel
 * has to be created before getExpoPushTokenAsync or no token is issued.
 */
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
  /**
   * Never prompts -- returns null when permission has not been granted. Called
   * on every sign-in and every foreground.
   */
  export async function register(): Promise<string | null> {
    // Before the permission check, not after: register runs on sign-in, ahead
    // of Home raising the prompt, and on Android 13+ the prompt does not appear
    // at all until a channel exists. Gating it behind `granted` would mean the
    // channel is only ever created once permission is already held.
    await ensureAndroidChannel();

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    const id = projectId();
    if (!id) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });

    // Never a table write: push_tokens grants no SELECT, and an upsert needs it
    // even when nothing conflicts. The RPC derives user_id from auth.uid(),
    // which is why no user id is passed or needed here.
    const { error } = await supabase.rpc('register_push_token', {
      target_token: token,
      target_platform: isIOS ? 'ios' : 'android'
    });

    if (error) throw error;

    return token;
  }

  /**
   * Called on sign-out. A handed-down or shared phone otherwise keeps
   * receiving a previous user's household alerts, which is a privacy leak
   * rather than mere noise.
   */
  export async function remove(): Promise<void> {
    const id = projectId();
    if (!id) return;

    try {
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
      await supabase.from('push_tokens').delete().eq('token', token);
    } catch {
      // Best effort. Never block sign-out on a token that cannot be resolved --
      // being unable to sign out is a far worse failure than a stale row, and
      // the DeviceNotRegistered sweep clears those anyway.
    }
  }
}

export default PushTokenService;
