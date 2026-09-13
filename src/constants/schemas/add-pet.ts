import { z } from 'zod';

import { feedTimeSchema } from '@/lib/form/pet-schemas';

// One schema for the whole flow, so a step gate and the final submit cannot
// disagree about what "valid" means. `birthdate` is required because add_pet
// casts it to a Postgres `date` and an empty string fails there instead.
export const addPetSchema = z.object({
  name: z.string().trim().min(1, { message: "Enter your pet's name" }),
  petType: z.enum(['dog', 'cat', 'other'], { message: 'Choose a pet type' }),
  sex: z.enum(['male', 'female'], { message: 'Select a sex' }),
  ageMode: z.enum(['birthdate', 'approximate']),
  birthdate: z.string().min(1, { message: 'Choose a date' }),
  // Always null for type `other`: there is no breed list for a rabbit.
  breedId: z.string().nullable(),
  photoUri: z.string().nullable(),
  feedTimes: z.array(feedTimeSchema)
});

export type AddPetFormValues = z.infer<typeof addPetSchema>;

export const ADD_PET_DETAIL_FIELDS = [
  'name',
  'petType',
  'sex',
  'ageMode',
  'birthdate',
  'breedId'
] as const;

export const ADD_PET_STEPS = ['Pet details', 'Feed times', 'What they eat'];
