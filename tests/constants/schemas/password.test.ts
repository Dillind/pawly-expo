import { passwordSchema } from '@/constants/schemas/password';
import { resetPasswordSchema } from '@/constants/schemas/reset-password';
import { signUpSchema } from '@/constants/schemas/sign-up';

const VALID = 'Crumpet123';

describe('passwordSchema', () => {
  it('accepts a password meeting every rule', () => {
    expect(passwordSchema.safeParse(VALID).success).toBe(true);
  });

  it.each([
    ['too short', 'Crumb12'],
    ['no capital', 'crumpet123'],
    ['no lower case', 'CRUMPET123'],
    ['no number', 'CrumpetPass']
  ])('rejects a password with %s', (_label, password) => {
    expect(passwordSchema.safeParse(password).success).toBe(false);
  });
});

describe('sign-up and reset agree', () => {
  it.each([VALID, 'crumpet123', 'Crumb12', 'CRUMPET123'])('treats %s the same way', (password) => {
    const signUp = signUpSchema.safeParse({ email: 'a@b.com', password }).success;
    const reset = resetPasswordSchema.safeParse({
      password,
      confirmPassword: password
    }).success;

    expect(signUp).toBe(reset);
  });
});
