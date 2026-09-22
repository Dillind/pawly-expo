import { z } from 'zod';

// A factory because the name is known only after the screen loads it. `delete_household`
// repeats the check, so no other caller can skip the confirmation.
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
