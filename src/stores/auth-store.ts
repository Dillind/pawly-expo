import type { UserProfile } from '@/types/core';
import { create } from 'zustand';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

type State = {
  status: AuthStatus;
  userId: string | undefined;
  profile: UserProfile | undefined;
  /**
   * Verifying a recovery code signs the user in, but they have not chosen a
   * password yet. This holds the router on (public) until they have. Kept in
   * memory on purpose: relaunching mid-reset lands you signed in, which is true.
   */
  isRecovering: boolean;
};

type Action = {
  setSession: (userId: string | undefined) => void;
  setProfile: (profile: UserProfile | undefined) => void;
  setRecovering: (isRecovering: boolean) => void;
};

const initialState: State = {
  status: 'loading',
  userId: undefined,
  profile: undefined,
  isRecovering: false
};

export const useAuthStore = create<State & Action>((set) => ({
  ...initialState,
  setSession: (userId) =>
    set({
      status: userId ? 'signedIn' : 'signedOut',
      userId
    }),
  setProfile: (profile) => set({ profile }),
  setRecovering: (isRecovering) => set({ isRecovering })
}));
