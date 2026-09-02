import { ageFromBirthdate, birthdateFromAge, formatBirthMonth } from '@/lib/dates';

const NOW = new Date('2026-09-02T10:00:00Z');

describe('birthdateFromAge', () => {
  it('snaps to the first of the month', () => {
    expect(birthdateFromAge({ years: 3, months: 6 }, NOW)).toBe('2023-03-01');
  });

  it('handles a pet under a year old', () => {
    expect(birthdateFromAge({ years: 0, months: 5 }, NOW)).toBe('2026-04-01');
  });

  it('handles a newborn', () => {
    expect(birthdateFromAge({ years: 0, months: 0 }, NOW)).toBe('2026-09-01');
  });
});

describe('ageFromBirthdate', () => {
  it('reads back what birthdateFromAge wrote', () => {
    for (const years of [0, 1, 7, 20]) {
      for (const months of [0, 5, 11]) {
        const birthdate = birthdateFromAge({ years, months }, NOW);

        expect(ageFromBirthdate(birthdate, NOW)).toEqual({ years, months });
      }
    }
  });

  it('never reports a negative age for a date in the future', () => {
    expect(ageFromBirthdate('2027-01-01', NOW)).toEqual({ years: 0, months: 0 });
  });
});

describe('formatBirthMonth', () => {
  it('names the month and the year', () => {
    expect(formatBirthMonth('2023-03-01')).toBe('Born around March 2023');
  });
});
