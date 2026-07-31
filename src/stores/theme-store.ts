import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { create } from 'zustand';

import type { ThemePreference } from '@/types/core';

const STORAGE_KEY = 'crumpet.themePreference';

const permittedPreferences: ThemePreference[] = ['system', 'light', 'dark'];

const parsePreference = (value: string | null): ThemePreference =>
  permittedPreferences.includes(value as ThemePreference) ? (value as ThemePreference) : 'system';

const applyNativeAppearance = (preference: ThemePreference) => {
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
};

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
    applyNativeAppearance(preference);
    set({ preference });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, preference);
    } catch {}
  },

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const preference = parsePreference(stored);

      applyNativeAppearance(preference);
      set({ preference, hasHydrated: true });
    } catch {
      applyNativeAppearance('system');
      set({ preference: 'system', hasHydrated: true });
    }
  }
}));
