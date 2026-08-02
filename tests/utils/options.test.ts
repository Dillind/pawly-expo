import { FEEDING_SCHEDULE_LABEL_OPTIONS, SEX_OPTIONS } from '@/constants/options';
import { optionLabel } from '@/utils/options';

describe('optionLabel', () => {
  it('reads the label for a stored value', () => {
    expect(optionLabel(SEX_OPTIONS, 'male')).toBe('Male');
    expect(optionLabel(FEEDING_SCHEDULE_LABEL_OPTIONS, 'dinner')).toBe('Dinner');
  });

  it('returns null for null or undefined rather than a stray label', () => {
    expect(optionLabel(SEX_OPTIONS, null)).toBeNull();
    expect(optionLabel(SEX_OPTIONS, undefined)).toBeNull();
  });

  it('returns null for a value not in the list', () => {
    expect(optionLabel(SEX_OPTIONS, 'unknown' as never)).toBeNull();
  });
});

describe('option lists', () => {
  it('covers every feeding schedule label the database enum allows', () => {
    expect(FEEDING_SCHEDULE_LABEL_OPTIONS.map((option) => option.value)).toEqual([
      'morning',
      'lunch',
      'dinner',
      'custom'
    ]);
  });

  it('stores lowercase values and displays capitalised labels', () => {
    for (const { value, label } of [...SEX_OPTIONS, ...FEEDING_SCHEDULE_LABEL_OPTIONS]) {
      expect(value).toBe(value.toLowerCase());
      expect(label[0]).toBe(label[0].toUpperCase());
    }
  });
});
