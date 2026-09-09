import { create } from 'zustand';

/**
 * What the Posts stream shows. A followed household is a different set from a
 * household you are in, so the two need a door between them rather than one
 * merged list -- ADR 0036.
 *
 * `all` is the default: the households you are in AND the ones you follow.
 */
export type PostsScope =
  | { kind: 'all' }
  | { kind: 'mine' }
  | { kind: 'following' }
  | { kind: 'household'; householdId: string };

type State = {
  scope: PostsScope;
  /**
   * The filter sheet is owned by the Posts screen, but the button that opens it
   * is a native bar item declared in the layout. This flag is the only thing
   * that crosses between them.
   */
  isFilterRequested: boolean;
};

type Action = {
  setScope: (scope: PostsScope) => void;
  requestFilter: () => void;
  clearFilterRequest: () => void;
};

const initialState: State = {
  scope: { kind: 'all' },
  isFilterRequested: false
};

const usePostsScopeStore = create<State & Action>((set) => ({
  ...initialState,
  setScope: (scope) => set({ scope }),
  requestFilter: () => set({ isFilterRequested: true }),
  clearFilterRequest: () => set({ isFilterRequested: false })
}));

export default usePostsScopeStore;
