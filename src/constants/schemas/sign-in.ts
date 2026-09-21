import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email({ message: 'Enter a valid email address' }),
  password: z.string().min(1, { message: 'Enter your password' })
});

export type SignInFormValues = z.infer<typeof signInSchema>;
