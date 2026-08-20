import { describeDays } from '@/utils/days';

describe('describeDays', () => {
  it('names the whole week and the empty case', () => {
    expect(describeDays([0, 1, 2, 3, 4, 5, 6])).toBe('Every day');
    expect(describeDays([])).toBe('Never');
  });

  it('names weekdays and weekends', () => {
    expect(describeDays([1, 2, 3, 4, 5])).toBe('Weekdays');
    expect(describeDays([0, 6])).toBe('Weekends');
  });

  it('collapses a run of three or more into a range', () => {
    expect(describeDays([1, 2, 3, 4, 5, 6])).toBe('Mon–Sat');
    expect(describeDays([3, 4, 5])).toBe('Wed–Fri');
  });

  it('lists short runs rather than ranging them', () => {
    expect(describeDays([1, 2])).toBe('Mon, Tue');
    expect(describeDays([0, 3])).toBe('Wed, Sun');
  });

  it('orders from Monday, so Sunday sorts last', () => {
    expect(describeDays([0, 1])).toBe('Mon, Sun');
  });
});
