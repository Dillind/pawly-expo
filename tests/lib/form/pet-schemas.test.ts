import { bioSchema, medicationSchema, slotSchema } from '@/lib/form/pet-schemas';

const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? null : (result.error?.issues[0]?.message ?? null);

describe('slotSchema', () => {
  it('accepts a known label and a 24-hour time', () => {
    expect(slotSchema.safeParse({ label: 'morning', scheduledTime: '07:00' }).success).toBe(true);
    expect(slotSchema.safeParse({ label: 'custom', scheduledTime: '23:59' }).success).toBe(true);
  });

  it('rejects a label outside the enum', () => {
    expect(slotSchema.safeParse({ label: 'brunch', scheduledTime: '07:00' }).success).toBe(false);
  });

  it('rejects a time that is not HH:mm', () => {
    for (const scheduledTime of ['7:00', '0700', '07:00:00', '', 'morning']) {
      const result = slotSchema.safeParse({ label: 'morning', scheduledTime });

      expect(result.success).toBe(false);
      expect(firstMessage(result)).toBe('Choose a time');
    }
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
