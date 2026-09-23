import { defaultAskingAs, followBackState, joinedNames, namesText } from '@/lib/follow-naming';
import type { NamedHousehold } from '@/services/follow.service';

const SMITHS = { id: 'smiths', name: 'The Smiths' };
const BEACH = { id: 'beach', name: 'Beach House' };

const named = (
  householdId: string,
  relationship: NamedHousehold['relationship']
): NamedHousehold => ({ householdId, name: householdId, handle: null, relationship });

describe('defaultAskingAs', () => {
  it('names the current Household when the viewer owns it', () => {
    expect(defaultAskingAs([SMITHS, BEACH], 'beach')).toEqual({
      householdIds: ['beach'],
      needsChoice: false
    });
  });

  it('names the only owned Household when the current one is not owned', () => {
    expect(defaultAskingAs([SMITHS], 'elsewhere')).toEqual({
      householdIds: ['smiths'],
      needsChoice: false
    });
  });

  it('asks when several are owned and none is current', () => {
    expect(defaultAskingAs([SMITHS, BEACH], 'elsewhere')).toEqual({
      householdIds: [],
      needsChoice: true
    });
  });

  it('names nothing and asks nothing for an Owner of none', () => {
    expect(defaultAskingAs([], 'elsewhere')).toEqual({ householdIds: [], needsChoice: false });
  });
});

describe('namesText and joinedNames', () => {
  it('shortens and joins', () => {
    expect(namesText([])).toBe('');
    expect(namesText(['The Smiths'])).toBe('The Smiths');
    expect(namesText(['The Smiths', 'Beach House'])).toBe('The Smiths + 1');
    expect(joinedNames(['The Smiths', 'Beach House'])).toBe('The Smiths and Beach House');
  });
});

describe('followBackState', () => {
  it('hides the button when nothing was named', () => {
    expect(followBackState([])).toEqual({ kind: 'hidden' });
  });

  it('hides the button for a Household the viewer is in or was removed from', () => {
    expect(followBackState([named('a', 'member'), named('b', 'blocked')])).toEqual({
      kind: 'hidden'
    });
  });

  it('offers one tap for one open Household', () => {
    expect(followBackState([named('a', 'none')])).toMatchObject({ kind: 'single' });
  });

  it('offers a choice when two can be shown', () => {
    const state = followBackState([named('a', 'none'), named('b', 'accepted')]);

    expect(state).toMatchObject({ kind: 'choose' });
  });

  it('reports Requested before Following once nothing is open', () => {
    expect(followBackState([named('a', 'accepted'), named('b', 'pending')])).toEqual({
      kind: 'settled',
      label: 'Requested'
    });
    expect(followBackState([named('a', 'accepted')])).toEqual({
      kind: 'settled',
      label: 'Following'
    });
  });
});
