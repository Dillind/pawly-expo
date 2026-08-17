import { nameSchema } from '@/constants/schemas/name';

describe('nameSchema', () => {
  it('accepts a first and last name', () => {
    expect(nameSchema.safeParse({ firstName: 'Sarah', lastName: 'Smith' }).success).toBe(true);
  });

  it('rejects whitespace posing as a name', () => {
    expect(nameSchema.safeParse({ firstName: '   ', lastName: 'Smith' }).success).toBe(false);
  });

  it('trims what it stores', () => {
    const result = nameSchema.parse({ firstName: '  Sarah ', lastName: ' Smith  ' });

    expect(result).toEqual({ firstName: 'Sarah', lastName: 'Smith' });
  });
});
