import type { CareCardInput } from '@/lib/form/pet-schemas';
import type { CareCard } from '@/services/care-card.service';

export type CareCardField = keyof CareCardInput;

export type CareCardSection = {
  id: string;
  /**
   * Named after the situation the sitter is in, not the columns underneath.
   * An owner filling in "If something goes wrong" is being told what a sitter
   * will need; one filling in "Vet details" is being told to do data entry.
   */
  title: string;
  blurb: string;
  fields: CareCardField[];
};

export const CARE_CARD_FIELD_LABELS: Record<CareCardField, string> = {
  allergies: 'Allergies',
  behaviourNotes: 'What sets them off',
  vetName: 'Vet',
  vetPhone: 'Vet phone',
  emergencyVetName: 'Emergency vet',
  emergencyVetPhone: 'Emergency vet phone',
  microchipNumber: 'Microchip number',
  insuranceProvider: 'Insurance provider',
  insurancePolicyNumber: 'Insurance policy number',
  feedingNotes: 'Feeding notes',
  walkRoutine: 'Walks and toileting',
  whereThingsAre: 'Where things are kept',
  notes: 'Notes'
};

// An example beats an instruction: the placeholder shows the shape of a good
// answer, which is what a Contributor reading this in a hurry needs.
export const CARE_CARD_FIELD_PLACEHOLDERS: Record<CareCardField, string> = {
  allergies: 'Chicken, and grass seeds in summer',
  behaviourNotes: 'Bolts at the front door. Hides in the bath during thunder.',
  vetName: 'Northcote Vet Clinic',
  vetPhone: '03 9482 1234',
  emergencyVetName: 'Melbourne Animal Emergency',
  emergencyVetPhone: '03 9370 5555',
  microchipNumber: '956000012345678',
  insuranceProvider: 'Petplan',
  insurancePolicyNumber: 'PP-4821993',
  feedingNotes: 'Half a scoop, soaked for five minutes',
  walkRoutine: 'Long walk before breakfast, short one after dinner. Lead on near the road.',
  whereThingsAre: 'Food in the laundry cupboard. Lead and towels on the hook by the back door.',
  notes: 'Nervous around bikes.'
};

export const CARE_CARD_MULTILINE_FIELDS: ReadonlySet<CareCardField> = new Set([
  'allergies',
  'behaviourNotes',
  'feedingNotes',
  'walkRoutine',
  'whereThingsAre',
  'notes'
]);

export const CARE_CARD_PHONE_FIELDS: ReadonlySet<CareCardField> = new Set([
  'vetPhone',
  'emergencyVetPhone'
]);

export const CARE_CARD_SECTIONS: CareCardSection[] = [
  {
    id: 'emergency',
    title: 'If something goes wrong',
    blurb: 'The numbers to ring, and which one answers at 2am.',
    fields: ['vetName', 'vetPhone', 'emergencyVetName', 'emergencyVetPhone']
  },
  {
    id: 'watch-for',
    title: 'What to watch for',
    blurb: 'Allergies, and the things that set them off.',
    fields: ['allergies', 'behaviourNotes']
  },
  {
    id: 'eating',
    title: 'How they eat',
    blurb: 'Amounts and quirks. The feed times themselves are set separately.',
    fields: ['feedingNotes']
  },
  {
    id: 'around-the-house',
    title: 'Getting around the house',
    blurb: 'Walks, toilet breaks, and where everything lives.',
    fields: ['walkRoutine', 'whereThingsAre']
  },
  {
    id: 'paperwork',
    title: 'Paperwork',
    blurb: 'Numbers a vet may ask for.',
    fields: ['microchipNumber', 'insuranceProvider', 'insurancePolicyNumber']
  },
  {
    id: 'anything-else',
    title: 'Anything else',
    blurb: "Whatever the other steps didn't cover.",
    fields: ['notes']
  }
];

/** Every field, in the order the sections present them. */
export const CARE_CARD_FIELDS: CareCardField[] = CARE_CARD_SECTIONS.flatMap(
  (section) => section.fields
);

export type CareCardStep =
  | { kind: 'section'; id: string; title: string; section: CareCardSection }
  | { kind: 'reaching-you'; id: 'reaching-you'; title: string }
  | { kind: 'medications'; id: 'medications'; title: string }
  | { kind: 'review'; id: 'review'; title: string };

const sectionStep = (id: string): CareCardStep => {
  const section = CARE_CARD_SECTIONS.find((candidate) => candidate.id === id);
  if (!section) throw new Error(`Unknown Care Card section: ${id}`);
  return { kind: 'section', id: section.id, title: section.title, section };
};

/** The editor's order, not the printed one: an owner fills in the easy things first. */
export const CARE_CARD_STEPS: CareCardStep[] = [
  // Its own kind: a contacts list rather than card fields.
  { kind: 'reaching-you', id: 'reaching-you', title: 'Reaching you' },
  sectionStep('emergency'),
  sectionStep('watch-for'),
  { kind: 'medications', id: 'medications', title: 'Medications' },
  sectionStep('eating'),
  sectionStep('around-the-house'),
  sectionStep('paperwork'),
  sectionStep('anything-else'),
  { kind: 'review', id: 'review', title: 'Ready to hand over' }
];

/**
 * A pet with no Care Card row yet reads the same as one whose fields are all
 * blank, so nothing downstream has to branch on null.
 */
export const emptyCareCard = (petId: string): CareCard => ({
  petId,
  ...(Object.fromEntries(CARE_CARD_FIELDS.map((field) => [field, null])) as CareCardInput)
});
