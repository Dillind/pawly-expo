import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY');
}

// `web.output: "static"` renders the route tree in Node, which has no `window`,
// and AsyncStorage is `window.localStorage` there. A client built with storage
// attached crashes the build inside `_recoverAndRefresh`.
const isBuildTimeRender = typeof window === 'undefined';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: isBuildTimeRender ? undefined : AsyncStorage,
    autoRefreshToken: !isBuildTimeRender,
    persistSession: !isBuildTimeRender,
    detectSessionInUrl: false
  }
});
