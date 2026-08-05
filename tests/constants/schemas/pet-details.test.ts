import { petDetailsEditSchema, petDetailsSchema } from '@/constants/schemas/pet-details';

const validPet = {
  name: 'Bailey',
  breed: 'Labrador',
  sex: 'male' as const,
  birthdate: '2026-03-28',
  birthdateIsApproximate: false,
  photoUri: null
};

describe('petDetailsSchema', () => {
  it('accepts a complete pet', () => {
    expect(petDetailsSchema.safeParse(validPet).success).toBe(true);
  });

  it.each([
    ['name', "Enter your pet's name"],
    ['breed', "Enter your pet's breed"],
    ['birthdate', "Enter your pet's birthdate"]
  ])('rejects an empty %s', (field, message) => {
    const result = petDetailsSchema.safeParse({ ...validPet, [field]: '' });

    expect(result.success).toBe(false);
    expect(result.success ? null : result.error.issues[0].message).toBe(message);
  });

  it('rejects a sex outside the enum', () => {
    const result = petDetailsSchema.safeParse({ ...validPet, sex: 'unknown' });

    expect(result.success).toBe(false);
    expect(result.success ? null : result.error.issues[0].message).toBe('Select a sex');
  });
});

describe('petDetailsEditSchema', () => {
  it('drops photoUri, which the pet header edits on its own', () => {
    const { photoUri: _photoUri, ...withoutPhoto } = validPet;

    expect(petDetailsEditSchema.safeParse(withoutPhoto).success).toBe(true);
  });

  it('keeps every other rule from the onboarding schema', () => {
    const { photoUri: _photoUri, ...withoutPhoto } = validPet;

    expect(petDetailsEditSchema.safeParse({ ...withoutPhoto, name: '' }).success).toBe(false);
    expect(petDetailsEditSchema.safeParse({ ...withoutPhoto, sex: 'unknown' }).success).toBe(false);
  });
});
