import { useHousehold } from '@/hooks/use-household';
import { supabase } from '@/lib/supabase/client';
import type { Pet } from '@/types/core';
import { useQuery } from '@tanstack/react-query';

async function fetchPets(householdId: string): Promise<Pet[]> {
  const { data, error } = await supabase
    .from('pets')
    .select('id, name, photo_url')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data.map((row) => ({ id: row.id, name: row.name, photoUrl: row.photo_url }));
}

/**
 * Every pet in the household, oldest first. `usePet()` returns only the oldest
 * one; this is the surface that shows the household actually has several.
 */
export function usePets() {
  const { data: household } = useHousehold();
  const householdId = household?.id;

  return useQuery({
    queryKey: ['pets', householdId],
    queryFn: () => fetchPets(householdId as string),
    enabled: Boolean(householdId)
  });
}
