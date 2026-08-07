import { z } from 'zod';

export const SCHEDULE_LABELS = ['morning', 'lunch', 'dinner', 'custom'] as const;

export const slotSchema = z.object({
  label: z.enum(SCHEDULE_LABELS),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time')
});

export type SlotInput = z.infer<typeof slotSchema>;

export const bioSchema = z.object({
  bio: z.string().max(500, 'Keep it under 500 characters').nullable()
});

export type BioInput = z.infer<typeof bioSchema>;

export const careCardSchema = z.object({
  allergies: z.string().nullable(),
  behaviourNotes: z.string().nullable(),
  vetName: z.string().nullable(),
  vetPhone: z.string().nullable(),
  emergencyVetName: z.string().nullable(),
  emergencyVetPhone: z.string().nullable(),
  ownerPhone: z.string().nullable(),
  backupContactName: z.string().nullable(),
  backupContactPhone: z.string().nullable(),
  microchipNumber: z.string().nullable(),
  insuranceProvider: z.string().nullable(),
  insurancePolicyNumber: z.string().nullable(),
  feedingNotes: z.string().nullable(),
  walkRoutine: z.string().nullable(),
  whereThingsAre: z.string().nullable(),
  notes: z.string().nullable()
});

export const medicationSchema = z.object({
  name: z.string().min(1, 'Give the medication a name'),
  dose: z.string().nullable(),
  scheduleText: z.string().nullable(),
  instructions: z.string().nullable()
});

export type CareCardInput = z.infer<typeof careCardSchema>;
export type MedicationInput = z.infer<typeof medicationSchema>;
