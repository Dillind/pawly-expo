import { z } from 'zod';

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
    confirmPassword: z.string()
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Both passwords must match',
    path: ['confirmPassword']
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
