import type { CareCardInput, MedicationInput } from '@/lib/form/pet-schemas';
import { supabase } from '@/lib/supabase/client';

export type CareCard = {
  petId: string;
  allergies: string | null;
  vetName: string | null;
  vetPhone: string | null;
  emergencyVetName: string | null;
  emergencyVetPhone: string | null;
  microchipNumber: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  feedingNotes: string | null;
  notes: string | null;
};

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

const CARE_CARD_COLUMNS: Record<keyof CareCardInput, string> = {
  allergies: 'allergies',
  vetName: 'vet_name',
  vetPhone: 'vet_phone',
  emergencyVetName: 'emergency_vet_name',
  emergencyVetPhone: 'emergency_vet_phone',
  microchipNumber: 'microchip_number',
  insuranceProvider: 'insurance_provider',
  insurancePolicyNumber: 'insurance_policy_number',
  feedingNotes: 'feeding_notes',
  notes: 'notes'
};

namespace CareCardService {
  export async function getCard(petId: string): Promise<CareCard | null> {
    const { data, error } = await supabase
      .from('care_cards')
      .select(
        'pet_id, allergies, vet_name, vet_phone, emergency_vet_name, emergency_vet_phone, microchip_number, insurance_provider, insurance_policy_number, feeding_notes, notes'
      )
      .eq('pet_id', petId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      petId: data.pet_id,
      allergies: data.allergies,
      vetName: data.vet_name,
      vetPhone: data.vet_phone,
      emergencyVetName: data.emergency_vet_name,
      emergencyVetPhone: data.emergency_vet_phone,
      microchipNumber: data.microchip_number,
      insuranceProvider: data.insurance_provider,
      insurancePolicyNumber: data.insurance_policy_number,
      feedingNotes: data.feeding_notes,
      notes: data.notes
    };
  }

  export async function listMedications(petId: string): Promise<Medication[]> {
    const { data, error } = await supabase
      .from('care_card_medications')
      .select('id, pet_id, name, dose, schedule_text, instructions, sort_order, created_at')
      .eq('pet_id', petId)
      // sort_order alone is not unique (every row defaults to 0), so Postgres
      // makes no ordering guarantee between ties -- created_at breaks the tie
      // deterministically.
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

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

  /**
   * Only the edited fields are written -- an upsert built from a full in-memory
   * snapshot would clobber a concurrent edit to a different field made by
   * another household member while this sheet was open.
   */
  export async function upsertCard(petId: string, patch: Partial<CareCardInput>): Promise<void> {
    const row: Record<string, string | null> = { pet_id: petId };
    for (const key of Object.keys(patch) as (keyof CareCardInput)[]) {
      row[CARE_CARD_COLUMNS[key]] = patch[key] || null;
    }

    const { error } = await supabase.from('care_cards').upsert(row, { onConflict: 'pet_id' });
    if (error) throw error;
  }

  export async function upsertMedication(
    petId: string,
    input: MedicationInput & { id?: string; sortOrder?: number }
  ): Promise<void> {
    let sortOrder = input.sortOrder;

    // New medications need a deterministic, increasing sort_order -- the column
    // defaults to 0, and with two or more rows at 0 Postgres makes no ordering
    // guarantee at all.
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

    const { error } = input.id
      ? await supabase.from('care_card_medications').update(row).eq('id', input.id)
      : await supabase.from('care_card_medications').insert(row);

    if (error) throw error;
  }

  export async function deleteMedication(medicationId: string): Promise<void> {
    const { error } = await supabase.from('care_card_medications').delete().eq('id', medicationId);
    if (error) throw error;
  }
}

export default CareCardService;
