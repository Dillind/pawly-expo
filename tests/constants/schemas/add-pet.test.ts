import { ADD_PET_DETAIL_FIELDS, addPetSchema } from '@/constants/schemas/add-pet';

const valid = {
  name: 'Bailey',
  petType: 'dog' as const,
  sex: 'male' as const,
  ageMode: 'birthdate' as const,
  birthdate: '2021-03-12',
  breed: '',
  photoUri: null,
  feedTimes: [
    {
      label: 'morning' as const,
      localTime: '07:00',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      instructions: null
    }
  ]
};

const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? null : (result.error?.issues[0]?.message ?? null);

describe('addPetSchema', () => {
  it('accepts a pet with no breed and no feeds', () => {
    expect(addPetSchema.safeParse({ ...valid, breed: '', feedTimes: [] }).success).toBe(true);
  });

  it('requires a name that is not just whitespace', () => {
    expect(firstMessage(addPetSchema.safeParse({ ...valid, name: '   ' }))).toBe(
      "Enter your pet's name"
    );
  });

  // add_pet casts this to a Postgres `date`, so an empty string fails there
  // rather than here -- at the very end of a three-step flow.
  it('requires a birthdate', () => {
    expect(firstMessage(addPetSchema.safeParse({ ...valid, birthdate: '' }))).toBe('Choose a date');
  });

  it('rejects a pet type outside the enum', () => {
    expect(addPetSchema.safeParse({ ...valid, petType: 'rabbit' }).success).toBe(false);
  });

  it('validates each feed time it holds', () => {
    const result = addPetSchema.safeParse({
      ...valid,
      feedTimes: [{ ...valid.feedTimes[0], daysOfWeek: [] }]
    });

    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe('Pick at least one day');
  });

  it('names every field step 1 owns, so the gate cannot drift from the schema', () => {
    const stepOne = [...ADD_PET_DETAIL_FIELDS];
    const inSchema = Object.keys(addPetSchema.shape);

    expect(stepOne.every((field) => inSchema.includes(field))).toBe(true);
    // Everything except the photo and the feeds, which later steps own.
    expect(inSchema.filter((field) => !stepOne.includes(field as never)).sort()).toEqual([
      'feedTimes',
      'photoUri'
    ]);
  });
});
