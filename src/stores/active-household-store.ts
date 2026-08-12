import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'crumpet.activeHouseholdId';

type State = {
  activeHouseholdId: string | undefined;
  hasHydrated: boolean;
};

type Action = {
  setActiveHousehold: (householdId: string) => Promise<void>;
  hydrate: () => Promise<void>;
};

const initialState: State = {
  activeHouseholdId: undefined,
  hasHydrated: false
};

/**
 * Which household the user is currently looking at. On the device rather than
 * on `users`, because it is a UI preference: switching on a phone should not
 * change what the same account shows on an iPad.
 */
export const useActiveHouseholdStore = create<State & Action>((set) => ({
  ...initialState,
  setActiveHousehold: async (householdId) => {
    set({ activeHouseholdId: householdId });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, householdId);
    } catch {}
  },

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      set({ activeHouseholdId: stored ?? undefined, hasHydrated: true });
    } catch {
      set({ hasHydrated: true });
    }
  }
}));
