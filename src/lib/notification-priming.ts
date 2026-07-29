import AsyncStorage from '@react-native-async-storage/async-storage';

const PRIMED_KEY = 'pawly.hasPrimedNotifications';

/**
 * Whether the priming sheet has already been shown once.
 *
 * AsyncStorage rather than a Zustand store: both existing stores are in-memory
 * with no persist middleware, and this flag has to survive a cold start or the
 * sheet reappears on every launch. It is already a direct dependency -- the
 * Supabase client uses it for session storage -- so nothing new is introduced.
 *
 * A read failure reports "already primed". Failing the other way would re-raise
 * a permission pitch on every launch, and the user is not stranded: the
 * Manage Notifications screen offers the same prompt while permission is
 * still undetermined.
 */
export async function hasPrimedNotifications(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PRIMED_KEY)) === 'true';
  } catch {
    return true;
  }
}

export async function markNotificationsPrimed(): Promise<void> {
  try {
    await AsyncStorage.setItem(PRIMED_KEY, 'true');
  } catch {
    // Worst case the sheet appears once more on the next launch.
  }
}
