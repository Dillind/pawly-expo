import {
  CARE_CARD_FIELD_LABELS,
  CARE_CARD_SECTIONS,
  type CareCardField
} from '@/constants/care-card-fields';
import type { CareCard, CareCardContact, Medication } from '@/services/care-card.service';

// Lifted into the top panel: a sitter at 2am is looking for one of these.
export const EMERGENCY_FIELDS: CareCardField[] = [
  'vetName',
  'vetPhone',
  'emergencyVetName',
  'emergencyVetPhone'
];

// `id` keys the row: two contacts can share a name, so the label cannot.
export type CareCardRow = { id: string; label: string; value: string };

export type CareCardMedicationEntry = {
  id: string;
  name: string;
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
    .map((field) => ({
      id: field,
      label: CARE_CARD_FIELD_LABELS[field],
      value: card[field] as string
    }));

// One ordering for the printed page and the card, so what you look at is what
// you hand over.
export const careCardBlocks = (
  card: CareCard,
  medications: Medication[],
  contacts: CareCardContact[] = []
): CareCardBlock[] => {
  const blocks: CareCardBlock[] = [];

  const emergencyRows = [
    ...contacts.map((contact) => ({
      id: contact.id,
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
        id: medication.id,
        name: medication.name,
        detail: [medication.dose, medication.scheduleText].filter(hasValue).join(' · ') || null,
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
      blocks.push({
        kind: 'fields',
        id: section.id,
        title: section.title,
        isEmergency: false,
        rows
      });
    }
  }

  return blocks;
};
