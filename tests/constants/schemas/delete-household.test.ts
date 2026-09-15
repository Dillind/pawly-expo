import { deleteHouseholdSchema } from '@/constants/schemas/delete-household';

const parse = (householdName: string, confirmation: string) =>
  deleteHouseholdSchema(householdName).safeParse({ confirmation });

const messageFor = (householdName: string, confirmation: string) => {
  const result = parse(householdName, confirmation);

  return result.success ? null : result.error.issues[0].message;
};

describe('deleteHouseholdSchema', () => {
  it('accepts the household name typed exactly', () => {
    expect(parse('Hollybank Cottage', 'Hollybank Cottage').success).toBe(true);
  });

  it('accepts surrounding whitespace, which a keyboard adds on its own', () => {
    expect(parse('Hollybank Cottage', '  Hollybank Cottage ').success).toBe(true);
  });

  it('asks for the name when the field is empty', () => {
    expect(messageFor('Hollybank Cottage', '')).toBe('Type the household name to confirm');
  });

  it('rejects a different name', () => {
    expect(messageFor('Hollybank Cottage', 'Hollybank')).toBe(
      "That doesn't match the household name"
    );
  });

  // The whole point of the gate is that the Owner reads the name and copies it,
  // so a case-folded comparison would let a glance through.
  it('rejects the right name in the wrong case', () => {
    expect(parse('Hollybank Cottage', 'hollybank cottage').success).toBe(false);
  });

  it('compares against a trimmed household name', () => {
    expect(parse('  Hollybank Cottage  ', 'Hollybank Cottage').success).toBe(true);
  });
});
