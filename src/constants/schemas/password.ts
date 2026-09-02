import { z } from 'zod';

import { PasswordRules } from '@/constants/enums';

export const passwordSchema = z
  .string()
  .min(8, { message: PasswordRules })
  .regex(/[a-z]/, { message: PasswordRules })
  .regex(/[A-Z]/, { message: PasswordRules })
  .regex(/\d/, { message: PasswordRules });
