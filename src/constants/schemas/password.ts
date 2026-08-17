import { PasswordRules } from '@/constants/enums';
import { z } from 'zod';

/**
 * One rule for every screen that creates a password. A password accepted at
 * sign-up has to be accepted at reset, so both import this rather than
 * declaring their own.
 */
export const passwordSchema = z
  .string()
  .min(8, { message: PasswordRules })
  .regex(/[a-z]/, { message: PasswordRules })
  .regex(/[A-Z]/, { message: PasswordRules })
  .regex(/\d/, { message: PasswordRules });
