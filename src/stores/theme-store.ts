import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { ThemePreference } from '@/types/core';

const STORAGE_KEY = 'crumpet.themePreference';

const permittedPreferences: ThemePreference[] = ['system', 'light', 'dark'];

const parsePreference = (value: string | null): ThemePreference =>
  permittedPreferences.includes(value as ThemePreference) ? (value as ThemePreference) : 'system';

type State = {
  preference: ThemePreference;
  hasHydrated: boolean;
};

type Action = {
  setPreference: (preference: ThemePreference) => Promise<void>;
  hydrate: () => Promise<void>;
};

const initialState: State = {
  preference: 'system',
  hasHydrated: false
};

export const useThemeStore = create<State & Action>((set) => ({
  ...initialState,
  setPreference: async (preference) => {
    set({ preference });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // The theme already changed; a failed write only costs the choice at next launch.
    }
  },
  // First paint waits on this, so a storage failure must still mark hydration
  // done or the app never renders at all.
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      set({ preference: parsePreference(stored), hasHydrated: true });
    } catch {
      set({ preference: 'system', hasHydrated: true });
    }
  }
}));
