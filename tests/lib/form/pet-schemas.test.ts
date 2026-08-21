import { bioSchema, feedTimeSchema, medicationSchema } from '@/lib/form/pet-schemas';

const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? null : (result.error?.issues[0]?.message ?? null);

describe('feedTimeSchema', () => {
  const base = { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], instructions: null };

  it('accepts a known label and a 24-hour time', () => {
    expect(feedTimeSchema.safeParse({ ...base, label: 'morning', localTime: '07:00' }).success).toBe(
      true
    );
    expect(feedTimeSchema.safeParse({ ...base, label: 'custom', localTime: '23:59' }).success).toBe(
      true
    );
  });

  it('rejects a label outside the enum', () => {
    expect(feedTimeSchema.safeParse({ ...base, label: 'brunch', localTime: '07:00' }).success).toBe(
      false
    );
  });

  it('rejects a time that is not HH:mm', () => {
    for (const localTime of ['7:00', '0700', '07:00:00', '', 'morning']) {
      const result = feedTimeSchema.safeParse({ ...base, label: 'morning', localTime });

      expect(result.success).toBe(false);
      expect(firstMessage(result)).toBe('Choose a time');
    }
  });

  it('rejects a feed that applies to no day', () => {
    const result = feedTimeSchema.safeParse({
      ...base,
      label: 'morning',
      localTime: '07:00',
      daysOfWeek: []
    });

    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe('Pick at least one day');
  });

  it('rejects a day outside 0 to 6', () => {
    expect(
      feedTimeSchema.safeParse({ ...base, label: 'morning', localTime: '07:00', daysOfWeek: [7] })
        .success
    ).toBe(false);
  });
});

describe('bioSchema', () => {
  it('accepts an empty bio and a null bio', () => {
    expect(bioSchema.safeParse({ bio: '' }).success).toBe(true);
    expect(bioSchema.safeParse({ bio: null }).success).toBe(true);
  });

  it('accepts exactly 500 characters and rejects 501', () => {
    expect(bioSchema.safeParse({ bio: 'a'.repeat(500) }).success).toBe(true);

    const result = bioSchema.safeParse({ bio: 'a'.repeat(501) });

    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe('Keep it under 500 characters');
  });
});

describe('medicationSchema', () => {
  it('requires a name and nothing else', () => {
    expect(
      medicationSchema.safeParse({
        name: 'Apoquel',
        dose: null,
        scheduleText: null,
        instructions: null
      }).success
    ).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = medicationSchema.safeParse({
      name: '',
      dose: null,
      scheduleText: null,
      instructions: null
    });

    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe('Give the medication a name');
  });
});
