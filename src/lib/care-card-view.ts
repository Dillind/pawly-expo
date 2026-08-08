import {
  CARE_CARD_FIELD_LABELS,
  CARE_CARD_SECTIONS,
  type CareCardField
} from '@/constants/care-card-fields';
import type { CareCard, CareCardContact, Medication } from '@/services/care-card.service';

/**
 * The fields lifted out of their sections and into the panel at the top. A
 * sitter reaching for this at 2am is looking for one of these, and making them
 * hunt through "Paperwork" to find the vet's number is the whole failure this
 * document exists to prevent.
 */
export const EMERGENCY_FIELDS: CareCardField[] = [
  'vetName',
  'vetPhone',
  'emergencyVetName',
  'emergencyVetPhone'
];

export type CareCardRow = { label: string; value: string };

export type CareCardMedicationEntry = {
  name: string;
  /** Dose and schedule joined, or null when neither was given. */
  detail: string | null;
  instructions: string | null;
};

export type CareCardBlock =
  | { kind: 'fields'; id: string; title: string; isEmergency: boolean; rows: CareCardRow[] }
  | { kind: 'medications'; id: string; title: string; items: CareCardMedicationEntry[] };

export const hasValue = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const fieldRows = (card: CareCard, fields: CareCardField[]): CareCardRow[] =>
  fields
    .filter((field) => hasValue(card[field]))
    .map((field) => ({ label: CARE_CARD_FIELD_LABELS[field], value: card[field] as string }));

/**
 * The one ordering both the printed page and the on-screen card follow, so what
 * you look at is what you hand over. Empty blocks are dropped, not blanked.
 */
export const careCardBlocks = (
  card: CareCard,
  medications: Medication[],
  contacts: CareCardContact[] = []
): CareCardBlock[] => {
  const blocks: CareCardBlock[] = [];

  // Contacts lead: a person to ring beats a clinic's opening hours.
  const emergencyRows = [
    ...contacts.map((contact) => ({
      label: contact.name,
      value: contact.phone ?? 'No number given'
    })),
    ...fieldRows(card, EMERGENCY_FIELDS)
  ];

  if (emergencyRows.length > 0) {
    blocks.push({
      kind: 'fields',
      id: 'emergency',
      title: 'If something goes wrong',
      isEmergency: true,
      rows: emergencyRows
    });
  }

  if (medications.length > 0) {
    blocks.push({
      kind: 'medications',
      id: 'medications',
      title: 'Medications',
      items: medications.map((medication) => ({
        name: medication.name,
        detail:
          [medication.dose, medication.scheduleText].filter(hasValue).join(' · ') || null,
        instructions: hasValue(medication.instructions) ? medication.instructions : null
      }))
    });
  }

  for (const section of CARE_CARD_SECTIONS) {
    const rows = fieldRows(
      card,
      section.fields.filter((field) => !EMERGENCY_FIELDS.includes(field))
    );

    if (rows.length > 0) {
      blocks.push({ kind: 'fields', id: section.id, title: section.title, isEmergency: false, rows });
    }
  }

  return blocks;
};

/** Card fields only -- medications and contacts are counted separately. */
export const filledFieldCount = (card: CareCard): number =>
  CARE_CARD_SECTIONS.flatMap((section) => section.fields).filter((field) => hasValue(card[field]))
    .length;
