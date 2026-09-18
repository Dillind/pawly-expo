import { describePackedAge, isPackedStale, packedAt } from '@/lib/travel-packing';

const now = new Date('2026-09-18T10:00:00Z');
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();

describe('packedAt', () => {
  it('is null for an empty list', () => {
    expect(packedAt([])).toBeNull();
  });

  it('is null while any item is unticked', () => {
    expect(
      packedAt([
        { isTicked: true, tickedAt: hoursAgo(2) },
        { isTicked: false, tickedAt: null }
      ])
    ).toBeNull();
  });

  it('is the latest tick when every item is ticked', () => {
    expect(
      packedAt([
        { isTicked: true, tickedAt: hoursAgo(5) },
        { isTicked: true, tickedAt: hoursAgo(1) },
        { isTicked: true, tickedAt: hoursAgo(3) }
      ])
    ).toBe(hoursAgo(1));
  });
});

describe('isPackedStale', () => {
  it('turns over at seven days', () => {
    expect(isPackedStale(hoursAgo(24 * 7 - 1), now)).toBe(false);
    expect(isPackedStale(hoursAgo(24 * 7), now)).toBe(true);
  });
});

describe('describePackedAge', () => {
  it.each([
    [0.5, 'just now'],
    [5, 'today'],
    [30, 'yesterday'],
    [24 * 9, '9 days ago'],
    [24 * 35, '5 weeks ago']
  ])('%s hours ago reads "%s"', (hours, expected) => {
    expect(describePackedAge(hoursAgo(hours), now)).toBe(expected);
  });

  it('never goes negative on a fast device clock', () => {
    expect(describePackedAge(hoursAgo(-1), now)).toBe('just now');
  });
});
