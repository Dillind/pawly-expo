import type { InfoBlock } from '@/components/bottom-sheets/info-sheet';

/**
 * What each role can do, in one place. This is the copy the invite screen's
 * help sheet shows, and it must stay in step with what the database actually
 * enforces in `set_member_role`, `remove_household_member` and the RLS on pets,
 * feeding schedules and households.
 */
export const ROLE_INFO: InfoBlock[] = [
  {
    kind: 'paragraph',
    text: 'Inviting someone gives them access to this household — its pets, feeding schedule, feed history and posts.'
  },
  { kind: 'heading', text: 'Owner' },
  {
    kind: 'paragraph',
    text: 'Everything a contributor can do, plus renaming the household, adding and removing pets, editing pet details and the Care Card, setting the feeding schedule, and inviting or removing members.'
  },
  { kind: 'heading', text: 'Contributor' },
  {
    kind: 'paragraph',
    text: 'Can log feeds and correct their own, post photos and like them, and read pets and Care Cards. They cannot change the feeding schedule or remove a pet.'
  },
  { kind: 'heading', text: 'You can change this later' },
  {
    kind: 'paragraph',
    text: 'As an owner you can change anyone’s role at any time, or remove them, from the Members screen. A household always keeps at least one owner.'
  }
];
