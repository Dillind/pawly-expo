import { passwordSchema } from '@/constants/schemas/password';
import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.email({ message: 'Enter a valid email address' }),
  password: passwordSchema
});

export type SignUpFormValues = z.infer<typeof signUpSchema>;
