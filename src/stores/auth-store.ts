import type { UserProfile } from '@/types/core';
import { create } from 'zustand';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

type State = {
  status: AuthStatus;
  userId: string | undefined;
  profile: UserProfile | undefined;
};

type Action = {
  setSession: (userId: string | undefined) => void;
  setProfile: (profile: UserProfile | undefined) => void;
};

const initialState: State = {
  status: 'loading',
  userId: undefined,
  profile: undefined
};

export const useAuthStore = create<State & Action>((set) => ({
  ...initialState,
  setSession: (userId) =>
    set({
      status: userId ? 'signedIn' : 'signedOut',
      userId
    }),
  setProfile: (profile) => set({ profile })
}));
