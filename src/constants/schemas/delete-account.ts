import { z } from 'zod';

// The delete-account Edge Function repeats this comparison.
export const DELETE_ACCOUNT_PHRASE = 'delete my account';

export const deleteAccountSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .min(1, 'Type the phrase to confirm')
    .refine((value) => value === DELETE_ACCOUNT_PHRASE, {
      message: "That doesn't match the phrase"
    }),
  password: z.string()
});

export type DeleteAccountInput = z.input<typeof deleteAccountSchema>;
