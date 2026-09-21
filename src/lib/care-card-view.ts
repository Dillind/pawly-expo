import {
  CARE_CARD_FIELD_LABELS,
  CARE_CARD_SECTIONS,
  CARE_CARD_STEPS,
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

// The back of the card lists every section, filled or not, so nothing a sitter
// might look for is hidden behind a second tap.
export type CareCardBackRow = {
  id: string;
  title: string;
  summary: string | null;
};

const sectionSummary = (card: CareCard, fields: CareCardField[]): string | null => {
  const values = fields
    .filter((field) => hasValue(card[field]))
    .map((field) => card[field] as string);
  return values.length > 0 ? values.join(' · ') : null;
};

export const careCardBackRows = (
  card: CareCard,
  medications: Medication[],
  contacts: CareCardContact[]
): CareCardBackRow[] =>
  CARE_CARD_STEPS.filter((step) => step.kind !== 'review').map((step) => {
    if (step.kind === 'reaching-you') {
      return {
        id: step.id,
        title: step.title,
        summary: contacts.length > 0 ? contacts.map((contact) => contact.name).join(' · ') : null
      };
    }

    if (step.kind === 'medications') {
      return {
        id: step.id,
        title: step.title,
        summary:
          medications.length > 0
            ? medications.map((medication) => medication.name).join(' · ')
            : null
      };
    }

    return {
      id: step.id,
      title: step.title,
      summary: sectionSummary(card, step.section.fields)
    };
  });

// The one number a sitter reaches for at 2am, in the order they would try it.
export const emergencyNumber = (
  card: CareCard,
  contacts: CareCardContact[]
): { label: string; value: string } | null => {
  if (hasValue(card.emergencyVetPhone)) {
    return { label: card.emergencyVetName ?? 'Emergency vet', value: card.emergencyVetPhone };
  }
  if (hasValue(card.vetPhone)) {
    return { label: card.vetName ?? 'Vet', value: card.vetPhone };
  }
  const contact = contacts.find((candidate) => hasValue(candidate.phone));
  return contact ? { label: contact.name, value: contact.phone as string } : null;
};
