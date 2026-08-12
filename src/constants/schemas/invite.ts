import { z } from 'zod';

export const inviteSchema = z.object({
  email: z.email({ message: 'Enter a valid email address' }),
  role: z.enum(['owner', 'contributor'])
});

export type InviteInput = z.infer<typeof inviteSchema>;

export const joinSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Enter the code you were given')
    .transform((value) => value.toUpperCase())
});

export type JoinInput = z.infer<typeof joinSchema>;
