import { formatCount } from '@/lib/numbers';

describe('formatCount', () => {
  it('leaves anything under a thousand alone', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(7)).toBe('7');
    expect(formatCount(999)).toBe('999');
  });

  it('compacts a thousand and above', () => {
    expect(formatCount(1000)).toBe('1k');
    expect(formatCount(1200)).toBe('1.2k');
    expect(formatCount(2000)).toBe('2k');
    expect(formatCount(15400)).toBe('15.4k');
  });

  it('truncates rather than rounds up, so a count never reads higher than it is', () => {
    expect(formatCount(1299)).toBe('1.2k');
    expect(formatCount(1999)).toBe('1.9k');
  });
});
