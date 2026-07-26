import { useHousehold } from '@/hooks/use-household';
import { supabase } from '@/lib/supabase/client';
import type { Pet } from '@/types/core';
import { useQuery } from '@tanstack/react-query';

async function fetchPet(householdId: string): Promise<Pet> {
  const { data, error } = await supabase
    .from('pets')
    .select('id, name, photo_url')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    photoUrl: data.photo_url
  };
}

/**
 * The household's pet. The data model supports many pets per household; the
 * v1 UI shows the oldest one, which is the one onboarding created.
 */
export function usePet() {
  const { data: household } = useHousehold();
  const householdId = household?.id;

  return useQuery({
    queryKey: ['pet', householdId],
    queryFn: () => fetchPet(householdId as string),
    enabled: Boolean(householdId)
  });
}
