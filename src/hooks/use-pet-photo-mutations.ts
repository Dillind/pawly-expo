import { supabase } from '@/lib/supabase/client';
import StorageService from '@/services/storage.service';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: ['pet-photos', petId] });
};

export function useAddPetPhoto(petId: string) {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    mutationFn: async (localUri: string) => {
      if (!userId) throw new Error('You need to sign in again before adding a photo');

      const response = await fetch(localUri);
      if (!response.ok) throw new Error('Could not read the selected photo');

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) throw new Error('The selected photo is empty');

      const path = `${userId}/${petId}/${Crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('pet-photos')
        .upload(path, arrayBuffer, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.rpc('add_pet_photo', {
        p_pet_id: petId,
        p_storage_path: path
      });

      if (insertError) {
        await supabase.storage.from('pet-photos').remove([path]);
        throw insertError;
      }
    },
    onSuccess: () => invalidate(queryClient, petId)
  });
}

export function useDeletePetPhoto(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      photoId,
      photoUrl,
      storagePath
    }: {
      photoId: string;
      photoUrl: string;
      storagePath: string;
    }) => {
      const { error: deleteRowError } = await supabase.rpc('delete_pet_photo', {
        p_photo_id: photoId,
        p_photo_url: photoUrl
      });
      if (deleteRowError) throw deleteRowError;

      const { error: deleteObjectError } = await supabase.storage
        .from('pet-photos')
        .remove([storagePath]);
      if (deleteObjectError) {
        throw new Error('The photo was removed, but its file could not be cleaned up');
      }
    },
    onSettled: () => {
      invalidate(queryClient, petId);
      void queryClient.invalidateQueries({ queryKey: ['pet-detail', petId] });
      void queryClient.invalidateQueries({ queryKey: ['pet'] });
      // ['pet'] does NOT prefix-match ['pets']: TanStack compares key elements,
      // not strings. Home's pets tile needs its own invalidation or it keeps
      // showing the deleted photo.
      void queryClient.invalidateQueries({ queryKey: ['pets'] });
    }
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
      void queryClient.invalidateQueries({ queryKey: ['pets'] });
    }
  });
}

/**
 * Replaces the pet's profile photo. This writes `pets.photo_url` only — the
 * cover is a single image, deliberately not a gallery row, which is the same
 * shape onboarding sets it in.
 */
export function useChangePetPhoto(petId: string) {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    mutationFn: async (localUri: string) => {
      if (!userId) throw new Error('You need to sign in again before changing the photo');

      const publicUrl = await StorageService.uploadPetPhoto({ userId, localUri });

      const { error } = await supabase
        .from('pets')
        .update({ photo_url: publicUrl })
        .eq('id', petId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pet-detail', petId] });
      void queryClient.invalidateQueries({ queryKey: ['pet'] });
      void queryClient.invalidateQueries({ queryKey: ['pets'] });
    }
  });
}
