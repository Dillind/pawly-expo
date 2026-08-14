import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY');
}

/**
 * `web.output: "static"` makes the production bundle render the route tree in
 * Node to build a server manifest, and Node has no `window`. AsyncStorage is
 * `window.localStorage` on web, and createClient initialises auth immediately,
 * so a client built with storage attached crashes the build before any code of
 * ours runs -- "ReferenceError: window is not defined" out of `_recoverAndRefresh`.
 *
 * React Native defines `window`, so this is false on device and on real web.
 * There is no session to persist during a build anyway.
 */
const isBuildTimeRender = typeof window === 'undefined';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: isBuildTimeRender ? undefined : AsyncStorage,
    autoRefreshToken: !isBuildTimeRender,
    persistSession: !isBuildTimeRender,
    detectSessionInUrl: false
  }
});
