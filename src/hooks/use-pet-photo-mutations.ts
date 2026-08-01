import { supabase } from '@/lib/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: ['pet-photos', petId] });
};

export function useAddPetPhoto(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (localUri: string) => {
      const response = await fetch(localUri);
      const arrayBuffer = await response.arrayBuffer();
      const path = `${petId}/${Crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('pet-photos')
        .upload(path, arrayBuffer, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      // New photos need a deterministic, increasing sort_order -- the column
      // defaults to 0, and with two or more rows at 0 Postgres makes no
      // ordering guarantee at all.
      const { data: maxRow, error: maxError } = await supabase
        .from('pet_photos')
        .select('sort_order')
        .eq('pet_id', petId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxError) throw maxError;
      const sortOrder = (maxRow?.sort_order ?? -1) + 1;

      const { error: insertError } = await supabase
        .from('pet_photos')
        .insert({ pet_id: petId, storage_path: path, sort_order: sortOrder });
      if (insertError) throw insertError;
    },
    onSuccess: () => invalidate(queryClient, petId)
  });
}

export function useDeletePetPhoto(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photoId: string) => {
      const { error } = await supabase.from('pet_photos').delete().eq('id', photoId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(queryClient, petId)
  });
}

export function useSetCoverPhoto(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (publicUrl: string) => {
      const { error } = await supabase
        .from('pets')
        .update({ photo_url: publicUrl })
        .eq('id', petId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pet-detail', petId] });
      void queryClient.invalidateQueries({ queryKey: ['pet'] });
    }
  });
}
