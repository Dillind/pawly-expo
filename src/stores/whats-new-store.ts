import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { RELEASES } from '@/constants/release-notes';
import { logError } from '@/lib/errors';
import { latestVersion, seedVersion } from '@/lib/whats-new';

const STORAGE_KEY = 'crumpet.whatsNew.lastSeenVersion';

type State = {
  lastSeenVersion: string;
  hasHydrated: boolean;
};

type Action = {
  hydrate: (isSignedIn: boolean) => Promise<void>;
  markSeen: () => Promise<void>;
};

const initialState: State = {
  lastSeenVersion: latestVersion(RELEASES),
  hasHydrated: false
};

const save = async (version: string) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, version);
  } catch (error) {
    logError(error);
  }
};

export const useWhatsNewStore = create<State & Action>((set, get) => ({
  ...initialState,

  hydrate: async (isSignedIn) => {
    if (get().hasHydrated) return;

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const lastSeenVersion = seedVersion(stored, isSignedIn, RELEASES);

      set({ lastSeenVersion, hasHydrated: true });
      if (stored !== lastSeenVersion) await save(lastSeenVersion);
    } catch (error) {
      logError(error);
      set({ lastSeenVersion: latestVersion(RELEASES), hasHydrated: true });
    }
  },

  markSeen: async () => {
    const version = latestVersion(RELEASES);

    set({ lastSeenVersion: version });
    await save(version);
  }
}));
