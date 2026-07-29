import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { supabase } from '@/lib/supabase/client';
import { isIOS } from '@/utils/platform';

const projectId = () => Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

namespace PushTokenService {
  /**
   * Never prompts -- returns null when permission has not been granted. Called
   * on every sign-in and every foreground.
   */
  export async function register(userId: string): Promise<string | null> {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    const id = projectId();
    if (!id) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });

    // The conflict clause handles two accounts on one phone: sign out, sign in
    // as your partner to test, and the same token is reassigned rather than
    // left as a stale row pushing one person's household alerts into another
    // person's session.
    const { error } = await supabase.from('push_tokens').upsert(
      {
        token,
        user_id: userId,
        platform: isIOS ? 'ios' : 'android',
        last_seen_at: new Date().toISOString()
      },
      { onConflict: 'token' }
    );

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
