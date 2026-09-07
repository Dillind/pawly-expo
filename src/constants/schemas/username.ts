import { z } from 'zod';

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
});

export type UsernameFormValues = z.infer<typeof usernameSchema>;
