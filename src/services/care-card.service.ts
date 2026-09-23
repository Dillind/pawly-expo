import type { CareCardContactInput, CareCardInput, MedicationInput } from '@/lib/form/pet-schemas';
import { assertWrote } from '@/lib/supabase/assert-wrote';
import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/unwrap';
import type { TablesInsert } from '@/types/database';

export type CareCard = {
  petId: string;
  allergies: string | null;
  behaviourNotes: string | null;
  vetName: string | null;
  vetPhone: string | null;
  emergencyVetName: string | null;
  emergencyVetPhone: string | null;
  microchipNumber: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  feedingNotes: string | null;
  walkRoutine: string | null;
  whereThingsAre: string | null;
  notes: string | null;
  // Kept fresh by the `care_cards_set_updated_at` trigger.
  updatedAt: string | null;
};

export type CareCardContact = {
  id: string;
  petId: string;
  name: string;
  phone: string | null;
  sortOrder: number;
  createdAt: string;
};

// At most three, enforced in the UI and by a trigger.
export const MAX_CARE_CARD_CONTACTS = 3;

export type Medication = {
  id: string;
  petId: string;
  name: string;
  dose: string | null;
  scheduleText: string | null;
  instructions: string | null;
  sortOrder: number;
  createdAt: string;
};

type CareCardColumn = Exclude<keyof TablesInsert<'care_cards'>, 'pet_id' | 'updated_at'>;

const CARE_CARD_COLUMNS: Record<keyof CareCardInput, CareCardColumn> = {
  allergies: 'allergies',
  behaviourNotes: 'behaviour_notes',
  vetName: 'vet_name',
  vetPhone: 'vet_phone',
  emergencyVetName: 'emergency_vet_name',
  emergencyVetPhone: 'emergency_vet_phone',
  microchipNumber: 'microchip_number',
  insuranceProvider: 'insurance_provider',
  insurancePolicyNumber: 'insurance_policy_number',
  feedingNotes: 'feeding_notes',
  walkRoutine: 'walk_routine',
  whereThingsAre: 'where_things_are',
  notes: 'notes'
};

const SELECTED_COLUMNS = ['pet_id', 'updated_at', ...Object.values(CARE_CARD_COLUMNS)].join(', ');

namespace CareCardService {
  export async function getCard(petId: string): Promise<CareCard | null> {
    const data = await unwrap(
      supabase
        .from('care_cards')
        .select(SELECTED_COLUMNS)
        .eq('pet_id', petId)
        .maybeSingle<Record<string, string | null>>()
    );
    if (!data) return null;

    return {
      petId: data.pet_id as string,
      allergies: data.allergies,
      behaviourNotes: data.behaviour_notes,
      vetName: data.vet_name,
      vetPhone: data.vet_phone,
      emergencyVetName: data.emergency_vet_name,
      emergencyVetPhone: data.emergency_vet_phone,
      microchipNumber: data.microchip_number,
      insuranceProvider: data.insurance_provider,
      insurancePolicyNumber: data.insurance_policy_number,
      feedingNotes: data.feeding_notes,
      walkRoutine: data.walk_routine,
      whereThingsAre: data.where_things_are,
      notes: data.notes,
      updatedAt: data.updated_at
    };
  }

  export async function listContacts(petId: string): Promise<CareCardContact[]> {
    const data = await unwrap(
      supabase
        .from('care_card_contacts')
        .select('id, pet_id, name, phone, sort_order, created_at')
        .eq('pet_id', petId)
        // sort_order is not unique, so created_at breaks the tie.
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
    );

    return data.map((row) => ({
      id: row.id,
      petId: row.pet_id,
      name: row.name,
      phone: row.phone,
      sortOrder: row.sort_order,
      createdAt: row.created_at
    }));
  }

  export async function upsertContact(
    petId: string,
    input: CareCardContactInput & { id?: string }
  ): Promise<void> {
    const row = { pet_id: petId, name: input.name, phone: input.phone };

    if (input.id) {
      const data = await unwrap(
        supabase.from('care_card_contacts').update(row).eq('id', input.id).select('id')
      );

      assertWrote(data, 'Only an owner can change this Care Card');
      return;
    }

    // The column defaults to 0, and Postgres guarantees no ordering between
    // two rows at 0.
    const { data: maxRow, error: maxError } = await supabase
      .from('care_card_contacts')
      .select('sort_order')
      .eq('pet_id', petId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxError) throw maxError;

    await unwrap(
      supabase
        .from('care_card_contacts')
        .insert({ ...row, sort_order: (maxRow?.sort_order ?? -1) + 1 })
    );
  }

  export async function deleteContact(contactId: string): Promise<void> {
    await unwrap(supabase.from('care_card_contacts').delete().eq('id', contactId));
  }

  export async function listMedications(petId: string): Promise<Medication[]> {
    const data = await unwrap(
      supabase
        .from('care_card_medications')
        .select('id, pet_id, name, dose, schedule_text, instructions, sort_order, created_at')
        .eq('pet_id', petId)
        // sort_order is not unique, so created_at breaks the tie.
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
    );

    return data.map((row) => ({
      id: row.id,
      petId: row.pet_id,
      name: row.name,
      dose: row.dose,
      scheduleText: row.schedule_text,
      instructions: row.instructions,
      sortOrder: row.sort_order,
      createdAt: row.created_at
    }));
  }

  // Only edited fields are written: an upsert from a full snapshot clobbers
  // another member's concurrent edit to a different field.
  export async function upsertCard(petId: string, patch: Partial<CareCardInput>): Promise<void> {
    const row: TablesInsert<'care_cards'> = { pet_id: petId };
    for (const key of Object.keys(patch) as (keyof CareCardInput)[]) {
      row[CARE_CARD_COLUMNS[key]] = patch[key] || null;
    }

    await unwrap(supabase.from('care_cards').upsert(row, { onConflict: 'pet_id' }));
  }

  export async function upsertMedication(
    petId: string,
    input: MedicationInput & { id?: string; sortOrder?: number }
  ): Promise<void> {
    let sortOrder = input.sortOrder;

    // The column defaults to 0, and Postgres guarantees no ordering between
    // two rows at 0.
    if (!input.id && sortOrder === undefined) {
      const { data: maxRow, error: maxError } = await supabase
        .from('care_card_medications')
        .select('sort_order')
        .eq('pet_id', petId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxError) throw maxError;
      sortOrder = (maxRow?.sort_order ?? -1) + 1;
    }

    const row = {
      pet_id: petId,
      name: input.name,
      dose: input.dose || null,
      schedule_text: input.scheduleText || null,
      instructions: input.instructions || null,
      ...(sortOrder !== undefined ? { sort_order: sortOrder } : {})
    };

    if (input.id) {
      const data = await unwrap(
        supabase.from('care_card_medications').update(row).eq('id', input.id).select('id')
      );

      assertWrote(data, 'Only an owner can change this Care Card');
      return;
    }

    await unwrap(supabase.from('care_card_medications').insert(row));
  }

  export async function deleteMedication(medicationId: string): Promise<void> {
    await unwrap(supabase.from('care_card_medications').delete().eq('id', medicationId));
  }
}

export default CareCardService;
