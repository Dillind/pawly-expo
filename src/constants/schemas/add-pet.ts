import { z } from 'zod';

import { feedTimeSchema } from '@/lib/form/pet-schemas';

/**
 * The whole flow's contract, in one schema. The three steps validate slices of
 * it with `trigger`, so a step gate and the final submit cannot disagree about
 * what "valid" means.
 *
 * `breedId` is nullable in both this and petDetailsSchema: with a fixed list
 * and an "Unknown" row, requiring it pushes a member into a wrong answer
 * rather than an honest one. `birthdate` is required because add_pet casts it to a Postgres
 * `date`, so an empty string fails there rather than here.
 */
export const addPetSchema = z.object({
  name: z.string().trim().min(1, { message: "Enter your pet's name" }),
  petType: z.enum(['dog', 'cat', 'other'], { message: 'Choose a pet type' }),
  sex: z.enum(['male', 'female'], { message: 'Select a sex' }),
  ageMode: z.enum(['birthdate', 'approximate']),
  birthdate: z.string().min(1, { message: 'Choose a date' }),
  // The chosen row from the bundled breed list, or null. A pet whose type is
  // `other` always carries null: we hold no breed list for a rabbit.
  breedId: z.string().nullable(),
  photoUri: z.string().nullable(),
  feedTimes: z.array(feedTimeSchema)
});

export type AddPetFormValues = z.infer<typeof addPetSchema>;

/** The fields step 1 owns. The gate between steps validates exactly these. */
export const ADD_PET_DETAIL_FIELDS = [
  'name',
  'petType',
  'sex',
  'ageMode',
  'birthdate',
  'breedId'
] as const;

/** The phase names the stepper draws, in order. */
export const ADD_PET_STEPS = ['Pet details', 'Feed times', 'What they eat'];
