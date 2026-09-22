import { featureRequestSchema } from '@/constants/schemas/feature-request';

describe('featureRequestSchema', () => {
  it('needs a title', () => {
    expect(featureRequestSchema.safeParse({ title: '   ', description: '' }).success).toBe(false);
  });

  it('allows an empty description', () => {
    expect(featureRequestSchema.safeParse({ title: 'Dark mode', description: '' }).success).toBe(
      true
    );
  });

  it('matches the 80 character title limit in Postgres', () => {
    expect(featureRequestSchema.safeParse({ title: 'a'.repeat(81), description: '' }).success).toBe(
      false
    );
  });

  it('matches the 500 character description limit in Postgres', () => {
    expect(
      featureRequestSchema.safeParse({ title: 'Dark mode', description: 'a'.repeat(501) }).success
    ).toBe(false);
  });
});
