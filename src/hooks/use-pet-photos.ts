import { supabase } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

export type PetPhoto = { id: string; url: string; storagePath: string; sortOrder: number };

async function fetchPetPhotos(petId: string): Promise<PetPhoto[]> {
  const { data, error } = await supabase
    .from('pet_photos')
    .select('id, storage_path, sort_order')
    .eq('pet_id', petId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    url: supabase.storage.from('pet-photos').getPublicUrl(row.storage_path).data.publicUrl,
    storagePath: row.storage_path,
    sortOrder: row.sort_order
  }));
}

export function usePetPhotos(petId: string) {
  return useQuery({
    queryKey: ['pet-photos', petId],
    queryFn: () => fetchPetPhotos(petId)
  });
}
