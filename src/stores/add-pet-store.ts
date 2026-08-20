import { EVERY_DAY, type FeedTimeInput } from '@/lib/form/pet-schemas';
import type { PetSex, PetType } from '@/types/core';
import { create } from 'zustand';

export type AgeMode = 'birthdate' | 'approximate';

type State = {
  name: string;
  petType: PetType;
  sex: PetSex;
  ageMode: AgeMode;
  birthdate: string;
  breed: string;
  photoUri: string | null;
  feedTimes: FeedTimeInput[];
  /** Which feed the pushed editor is working on. -1 means a new one. */
  editingIndex: number;
};

type Action = {
  setDetails: (details: Partial<State>) => void;
  setPetType: (petType: PetType) => void;
  editFeedTime: (index: number) => void;
  saveFeedTime: (feedTime: FeedTimeInput) => void;
  removeFeedTime: (index: number) => void;
  setInstructions: (index: number, instructions: string | null) => void;
  reset: () => void;
};

const DEFAULT_FEED_TIMES: FeedTimeInput[] = [
  { label: 'morning', localTime: '07:00', daysOfWeek: [...EVERY_DAY], instructions: null },
  { label: 'dinner', localTime: '17:00', daysOfWeek: [...EVERY_DAY], instructions: null }
];

const initialState: State = {
  name: '',
  petType: 'dog',
  sex: 'male',
  ageMode: 'birthdate',
  birthdate: '',
  breed: '',
  photoUri: null,
  feedTimes: DEFAULT_FEED_TIMES,
  editingIndex: -1
};

/**
 * The flow spans four screens, so the values cannot live in one form. The store
 * is the flow — `reset` on leaving it is what stops a discarded pet turning up
 * in the next one.
 */
const useAddPetStore = create<State & Action>((set) => ({
  ...initialState,
  setDetails: (details) => set(details),
  setPetType: (petType) => set({ petType }),
  editFeedTime: (editingIndex) => set({ editingIndex }),
  saveFeedTime: (feedTime) =>
    set((state) => ({
      feedTimes:
        state.editingIndex < 0
          ? [...state.feedTimes, feedTime]
          : state.feedTimes.map((each, index) => (index === state.editingIndex ? feedTime : each))
    })),
  removeFeedTime: (index) =>
    set((state) => ({ feedTimes: state.feedTimes.filter((_, each) => each !== index) })),
  setInstructions: (index, instructions) =>
    set((state) => ({
      feedTimes: state.feedTimes.map((each, position) =>
        position === index ? { ...each, instructions } : each
      )
    })),
  reset: () => set({ ...initialState, feedTimes: DEFAULT_FEED_TIMES })
}));

export default useAddPetStore;
