import { countDigits, countText } from '@/utils/counts';

describe('countText', () => {
  it('spells a small count, because the artboards read as words', () => {
    expect(countText(0, 'pet')).toBe('No pets');
    expect(countText(1, 'pet')).toBe('One pet');
    expect(countText(3, 'pet')).toBe('Three pets');
    expect(countText(10, 'pet')).toBe('Ten pets');
  });

  it('falls back to a digit past ten', () => {
    expect(countText(11, 'pet')).toBe('11 pets');
  });

  it('takes an irregular plural', () => {
    expect(countText(2, 'person', 'people')).toBe('Two people');
  });
});

describe('countDigits', () => {
  it('keeps the digit, for a count beside a label', () => {
    expect(countDigits(1, 'household')).toBe('1 household');
    expect(countDigits(3, 'household')).toBe('3 households');
  });
});
