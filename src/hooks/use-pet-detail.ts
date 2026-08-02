import { supabase } from '@/lib/supabase/client';
import type { PetSex } from '@/types/core';
import { useQuery } from '@tanstack/react-query';

export type PetDetail = {
  id: string;
  name: string;
  breed: string | null;
  sex: PetSex | null;
  birthdate: string | null;
  birthdateIsApproximate: boolean;
  photoUrl: string | null;
  bio: string | null;
};

async function fetchPetDetail(petId: string): Promise<PetDetail> {
  const { data, error } = await supabase
    .from('pets')
    .select('id, name, breed, sex, birthdate, birthdate_is_approximate, photo_url, bio')
    .eq('id', petId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    breed: data.breed,
    sex: data.sex,
    birthdate: data.birthdate,
    birthdateIsApproximate: data.birthdate_is_approximate,
    photoUrl: data.photo_url,
    bio: data.bio
  };
}

export function usePetDetail(petId: string | undefined) {
  return useQuery({
    queryKey: ['pet-detail', petId],
    queryFn: () => fetchPetDetail(petId as string),
    enabled: Boolean(petId)
  });
}
