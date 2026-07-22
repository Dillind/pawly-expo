import type { UserProfile } from '@/types/core';
import { create } from 'zustand';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

type AuthState = {
  status: AuthStatus;
  userId: string | undefined;
  profile: UserProfile | undefined;
  setSession: (userId: string | undefined) => void;
  setProfile: (profile: UserProfile | undefined) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  userId: undefined,
  profile: undefined,
  setSession: (userId) =>
    set({
      status: userId ? 'signedIn' : 'signedOut',
      userId
    }),
  setProfile: (profile) => set({ profile })
}));
