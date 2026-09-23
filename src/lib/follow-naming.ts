import type { NamedHousehold } from '@/services/follow.service';

type OwnedHousehold = { id: string; name: string };

export type AskingAsDefault = {
  householdIds: string[];
  // Owner of several, and the current one is not among them: ask before sending.
  needsChoice: boolean;
};

export type FollowBackState =
  | { kind: 'hidden' }
  | { kind: 'settled'; label: 'Following' | 'Requested' }
  | { kind: 'single'; household: NamedHousehold }
  | { kind: 'choose'; households: NamedHousehold[] };

export function defaultAskingAs(
  owned: OwnedHousehold[],
  currentHouseholdId: string | undefined
): AskingAsDefault {
  if (owned.some((household) => household.id === currentHouseholdId)) {
    return { householdIds: [currentHouseholdId as string], needsChoice: false };
  }

  if (owned.length === 1) return { householdIds: [owned[0].id], needsChoice: false };

  return { householdIds: [], needsChoice: owned.length > 1 };
}

export function namesText(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';

  return `${names[0]} + ${names.length - 1}`;
}

export function joinedNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';

  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// A Household the viewer is in, or was removed from, can never be followed back.
export function followBackState(named: NamedHousehold[]): FollowBackState {
  const candidates = named.filter(
    (household) => household.relationship !== 'member' && household.relationship !== 'blocked'
  );
  const open = candidates.filter((household) => household.relationship === 'none');

  if (candidates.length === 0) return { kind: 'hidden' };

  if (open.length === 0) {
    const isWaiting = candidates.some((household) => household.relationship === 'pending');

    return { kind: 'settled', label: isWaiting ? 'Requested' : 'Following' };
  }

  if (candidates.length === 1) return { kind: 'single', household: open[0] };

  return { kind: 'choose', households: candidates };
}
