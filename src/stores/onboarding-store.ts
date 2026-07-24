import { create } from 'zustand';

export type FeedingTime = {
  time: string;
  label: 'morning' | 'lunch' | 'dinner' | 'custom';
};

export type PetDetails = {
  name: string;
  breed: string;
  sex: 'male' | 'female';
  birthdate: string;
  birthdateIsApproximate: boolean;
  photoUri: string | null;
};

type State = {
  petDetails: PetDetails | null;
  timezone: string;
  feedingTimes: FeedingTime[];
};

type Action = {
  setPetDetails: (details: PetDetails) => void;
  setSchedule: (params: { timezone: string; feedingTimes: FeedingTime[] }) => void;
  resetOnboarding: () => void;
};

const defaultFeedingTimes: FeedingTime[] = [
  { time: '07:00', label: 'morning' },
  { time: '12:00', label: 'lunch' },
  { time: '17:00', label: 'dinner' }
];

const initialState: State = {
  petDetails: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  feedingTimes: defaultFeedingTimes
};

export const useOnboardingStore = create<State & Action>((set) => ({
  ...initialState,
  setPetDetails: (details) => set({ petDetails: details }),
  setSchedule: (params) => set(params),
  resetOnboarding: () => set({ ...initialState, feedingTimes: defaultFeedingTimes })
}));
