import { supabase } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

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

async function fetchCareCard(petId: string): Promise<CareCard | null> {
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

async function fetchMedications(petId: string): Promise<Medication[]> {
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

export function useCareCard(petId: string | undefined) {
  return useQuery({
    queryKey: ['care-card', petId],
    queryFn: async () => {
      const [card, medications] = await Promise.all([
        fetchCareCard(petId as string),
        fetchMedications(petId as string)
      ]);
      return { card, medications };
    },
    enabled: Boolean(petId)
  });
}
