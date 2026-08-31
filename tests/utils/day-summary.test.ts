import type { Occurrence } from '@/types/core';
import { describeDay } from '@/utils/day-summary';

const occurrence = (state: Occurrence['state']): Occurrence =>
  ({
    seriesId: `series-${state}`,
    occurrenceDate: '2026-08-31',
    localTime: '07:00:00',
    label: 'morning',
    instructions: null,
    scheduledAt: '2026-08-30T21:00:00.000Z',
    state,
    satisfyingLogId: null,
    satisfiedAt: null,
    satisfiedBy: null
  }) as Occurrence;

describe('describeDay, on today', () => {
  it('counts what is still to log, due and missed alike', () => {
    expect(describeDay([occurrence('due'), occurrence('missed'), occurrence('fed')], true)).toBe(
      '2 feeds to log'
    );
  });

  it('says one feed, not 1 feeds', () => {
    expect(describeDay([occurrence('due')], true)).toBe('1 feed to log');
  });

  it('does not call a day done while feeds are still ahead of it', () => {
    expect(describeDay([occurrence('fed'), occurrence('upcoming')], true)).toBe(
      '1 feed still to come'
    );
  });

  it('only says done when every feed is logged', () => {
    expect(describeDay([occurrence('fed'), occurrence('fed')], true)).toBe('All done for today');
  });

  it('has a sentence for a pet with nothing on', () => {
    expect(describeDay([], true)).toBe('Nothing scheduled today');
  });
});

describe('describeDay, on another day', () => {
  // "All done for today" over next Thursday is a lie, so another day never
  // borrows today's sentences.
  it('describes the schedule rather than the progress', () => {
    expect(describeDay([occurrence('upcoming'), occurrence('upcoming')], false)).toBe(
      '2 feeds scheduled'
    );
    expect(describeDay([], false)).toBe('Nothing scheduled');
  });
});
