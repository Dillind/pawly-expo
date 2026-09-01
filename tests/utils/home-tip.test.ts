import type { FeedTime } from '@/services/feed-time.service';
import type { Pet } from '@/types/core';
import { findHomeTip } from '@/utils/home-tip';

const pet = (id: string, name: string) => ({ id, name }) as Pet;

const feedTime = (label: FeedTime['label']): FeedTime => ({
  seriesId: `series-${label}`,
  localTime: '07:00:00',
  label,
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  instructions: null
});

const crumpet = pet('pet-1', 'Crumpet');
const toby = pet('pet-2', 'Toby');

describe('findHomeTip', () => {
  it('says nothing when every pet is set up', () => {
    const tip = findHomeTip([crumpet, toby], {
      'pet-1': [feedTime('morning'), feedTime('dinner')],
      'pet-2': [feedTime('dinner')]
    });

    expect(tip).toBeNull();
  });

  it('names a pet with no feeds at all', () => {
    const tip = findHomeTip([crumpet], { 'pet-1': [] });

    expect(tip).toEqual({
      petId: 'pet-1',
      title: 'Crumpet has no feeds set up.',
      action: 'Add a feed time'
    });
  });

  it('names a pet with feeds but no dinner', () => {
    const tip = findHomeTip([crumpet], { 'pet-1': [feedTime('morning')] });

    expect(tip?.title).toBe('Crumpet has no dinner set up.');
  });

  it('holds its tongue while a query is still in flight', () => {
    // An absent key is "not answered yet", not "no feed times". The difference
    // is a tip that flashes on and retracts.
    expect(findHomeTip([crumpet], {})).toBeNull();
  });

  it('returns one tip, and the first pet in order wins', () => {
    const tip = findHomeTip([crumpet, toby], { 'pet-1': [], 'pet-2': [] });

    expect(tip?.petId).toBe('pet-1');
  });
});
