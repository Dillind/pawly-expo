import type { Occurrence } from '@/types/core';
import { summarisePetDay } from '@/utils/pet-status';

const occurrence = (overrides: Partial<Occurrence>): Occurrence => ({
  seriesId: 'series-1',
  occurrenceDate: '2026-08-31',
  localTime: '07:00:00',
  label: 'morning',
  instructions: null,
  scheduledAt: '2026-08-30T21:00:00.000Z',
  state: 'upcoming',
  satisfyingLogId: null,
  satisfiedAt: null,
  satisfiedBy: null,
  ...overrides
});

describe('summarisePetDay', () => {
  it('puts a pause ahead of everything else', () => {
    expect(summarisePetDay([], true, true)).toBe('Paused — no feeds expected');
  });

  it('separates a pet with no feeds today from one with none set up', () => {
    expect(summarisePetDay([], false, true)).toBe('No feeds today');
    expect(summarisePetDay([], false, false)).toBe('No feeds set up yet');
  });

  it('names an overdue feed before the next one due', () => {
    const summary = summarisePetDay(
      [
        occurrence({ state: 'missed', label: 'morning', localTime: '07:00:00' }),
        occurrence({ seriesId: 'series-2', state: 'due', label: 'dinner', localTime: '17:30:00' })
      ],
      false,
      true
    );

    expect(summary).toBe('Morning was due at 7:00 AM');
  });

  it('counts what was logged once nothing is outstanding', () => {
    const fed = occurrence({ state: 'fed' });

    expect(summarisePetDay([fed], false, true)).toBe('Logged once today');
    expect(summarisePetDay([fed, { ...fed, seriesId: 'series-2' }], false, true)).toBe(
      'Logged 2 times today'
    );
  });
});
