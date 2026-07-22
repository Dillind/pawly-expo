import { z } from 'zod';

export const signUpSchema = z.object({
  firstName: z.string().min(1, { message: 'Enter your first name' }),
  lastName: z.string().min(1, { message: 'Enter your last name' }),
  email: z.email({ message: 'Enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' })
});

export type SignUpFormValues = z.infer<typeof signUpSchema>;
