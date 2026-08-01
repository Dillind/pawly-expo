import { supabase } from '@/lib/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type PetPatch = { name?: string; breed?: string | null; bio?: string | null };

export function useUpdatePet(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: PetPatch) => {
      const { error } = await supabase.from('pets').update(patch).eq('id', petId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pet-detail', petId] });
      void queryClient.invalidateQueries({ queryKey: ['pet'] });
    }
  });
}
