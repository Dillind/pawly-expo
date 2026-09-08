import { z } from 'zod';

/**
 * Names the app itself might want to speak with. This list must match the
 * `users_username_not_reserved` check constraint -- without it a reserved word
 * passes validation, comes back unavailable, and the screen reports it as
 * taken, which is not true.
 */
export const RESERVED_USERNAMES = ['admin', 'crumpet', 'support', 'owner', 'help'];

/**
 * The same rule the `users_username_format` check constraint enforces. Both
 * exist on purpose: this one tells the Member what is wrong while they type,
 * and the constraint is what makes it true.
 */
export const usernameSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, { message: 'Use at least 3 characters' })
    .max(20, { message: 'Use 20 characters or fewer' })
    .regex(/^[a-z]/, { message: 'Start with a letter' })
    .regex(/^[a-z0-9_]*$/, { message: 'Use letters, numbers and underscores only' })
    .refine((value) => !RESERVED_USERNAMES.includes(value), {
      message: 'That username is reserved'
    })
});

export type UsernameFormValues = z.infer<typeof usernameSchema>;
