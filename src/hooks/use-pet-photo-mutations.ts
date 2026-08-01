import { supabase } from '@/lib/supabase/client';
import StorageService from '@/services/storage.service';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';

const PET_PHOTOS_BUCKET = 'pet-photos';

/**
 * A public URL is `.../object/public/pet-photos/<path>`. Returns null for
 * anything that is not one of ours, so a hand-set or external URL is left alone.
 */
const storagePathFromPublicUrl = (url: string | null): string | null => {
  if (!url) return null;

  const marker = `/object/public/${PET_PHOTOS_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;

  const path = url.slice(index + marker.length).split('?')[0];
  return path.length > 0 ? decodeURIComponent(path) : null;
};

export type ChangePetPhotoInput = { localUri: string; previousUrl: string | null };

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
    mutationFn: async ({ photoId, photoUrl }: { photoId: string; photoUrl: string }) => {
      // The RPC returns the row's storage_path. Trust that over anything the
      // client is holding: it is read inside the same transaction as the delete.
      const { data: storagePath, error: deleteRowError } = await supabase.rpc('delete_pet_photo', {
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
    mutationFn: async ({ localUri, previousUrl }: ChangePetPhotoInput) => {
      if (!userId) throw new Error('You need to sign in again before changing the photo');

      const publicUrl = await StorageService.uploadPetPhoto({ userId, localUri });

      const { error } = await supabase
        .from('pets')
        .update({ photo_url: publicUrl })
        .eq('id', petId);

      if (error) throw error;

      // Best effort, and deliberately not awaited into the result: the photo has
      // already changed. A member who did not upload the old file cannot delete
      // it under the storage policy, and failing the whole mutation over a
      // leftover object would be worse than the leftover.
      const previousPath = storagePathFromPublicUrl(previousUrl);
      if (previousPath) {
        await supabase.storage.from(PET_PHOTOS_BUCKET).remove([previousPath]);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pet-detail', petId] });
      void queryClient.invalidateQueries({ queryKey: ['pet'] });
      void queryClient.invalidateQueries({ queryKey: ['pets'] });
    }
  });
}
