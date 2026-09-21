import { signInSchema } from '@/constants/schemas/sign-in';

const EMAIL = 'dog@crumpet.app';

describe('signInSchema', () => {
  it('accepts any non-empty password', () => {
    expect(signInSchema.safeParse({ email: EMAIL, password: 'a' }).success).toBe(true);
  });

  it('asks for a password when it is empty', () => {
    const result = signInSchema.safeParse({ email: EMAIL, password: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Enter your password');
  });
});
