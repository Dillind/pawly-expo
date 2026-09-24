import { z } from 'zod';

import { resetPasswordSchema } from '@/constants/schemas/reset-password';

export const updatePasswordSchema = z
  .object({ currentPassword: z.string().min(1, 'Enter your current password') })
  .and(resetPasswordSchema);

export type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;
