import { resetPasswordSchema } from '@/constants/schemas/reset-password';

describe('resetPasswordSchema', () => {
  it('accepts two matching passwords that meet the rules', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'Crumpet123',
      confirmPassword: 'Crumpet123'
    });

    expect(result.success).toBe(true);
  });

  it('reports a mismatch against the confirm field', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'Crumpet123',
      confirmPassword: 'Crumpet124'
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['confirmPassword']);
  });

  it('rejects a password that does not meet the rules', () => {
    const result = resetPasswordSchema.safeParse({ password: 'short', confirmPassword: 'short' });

    expect(result.success).toBe(false);
  });
});
