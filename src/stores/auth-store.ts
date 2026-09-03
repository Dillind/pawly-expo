import { create } from 'zustand';

import type { UserProfile } from '@/types/core';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

type State = {
  status: AuthStatus;
  userId: string | undefined;
  profile: UserProfile | undefined;
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
