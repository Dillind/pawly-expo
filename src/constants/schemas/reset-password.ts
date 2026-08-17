import { passwordSchema } from '@/constants/schemas/password';
import { z } from 'zod';

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string()
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Both passwords must match',
    path: ['confirmPassword']
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
