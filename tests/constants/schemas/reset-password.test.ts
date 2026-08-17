import { resetPasswordSchema } from '@/constants/schemas/reset-password';

describe('resetPasswordSchema', () => {
  it('accepts two matching passwords of at least eight characters', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'crumpet123',
      confirmPassword: 'crumpet123'
    });

    expect(result.success).toBe(true);
  });

  it('reports a mismatch against the confirm field', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'crumpet123',
      confirmPassword: 'crumpet124'
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['confirmPassword']);
  });

  it('rejects a password shorter than eight characters', () => {
    const result = resetPasswordSchema.safeParse({ password: 'short', confirmPassword: 'short' });

    expect(result.success).toBe(false);
  });
});
