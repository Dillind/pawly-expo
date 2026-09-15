import { z } from 'zod';

// A factory rather than a constant, because the only rule is "matches this
// Household's name" and the name is not known until the screen has loaded it.
// `delete_household` repeats the same comparison, so a caller that is not this
// screen cannot skip the confirmation.
export const deleteHouseholdSchema = (householdName: string) =>
  z.object({
    confirmation: z
      .string()
      .trim()
      .min(1, 'Type the household name to confirm')
      .refine((value) => value === householdName.trim(), {
        message: "That doesn't match the household name"
      })
  });

export type DeleteHouseholdInput = z.infer<ReturnType<typeof deleteHouseholdSchema>>;
