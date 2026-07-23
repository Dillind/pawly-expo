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

type OnboardingState = {
  petDetails: PetDetails | null;
  timezone: string;
  feedingTimes: FeedingTime[];
  setPetDetails: (details: PetDetails) => void;
  setSchedule: (params: { timezone: string; feedingTimes: FeedingTime[] }) => void;
  reset: () => void;
};

const defaultFeedingTimes: FeedingTime[] = [
  { time: '07:00', label: 'morning' },
  { time: '12:00', label: 'lunch' },
  { time: '17:00', label: 'dinner' }
];

const initialState = {
  petDetails: null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  feedingTimes: defaultFeedingTimes
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setPetDetails: (details) => set({ petDetails: details }),
  setSchedule: (params) => set(params),
  reset: () => set({ ...initialState, feedingTimes: defaultFeedingTimes })
}));
