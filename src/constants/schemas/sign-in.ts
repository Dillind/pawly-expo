import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email({ message: 'Enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' })
});

export type SignInFormValues = z.infer<typeof signInSchema>;
