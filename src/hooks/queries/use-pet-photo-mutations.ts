import PetPhotoService from '@/services/pet-photo.service';
import PetService from '@/services/pet.service';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type ChangePetPhotoInput = { localUri: string; previousUrl: string | null };

const invalidateCover = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: ['pet-detail', petId] });
  void queryClient.invalidateQueries({ queryKey: ['pet'] });
  void queryClient.invalidateQueries({ queryKey: ['pets'] });
};

export function useAddPetPhoto(petId: string) {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    mutationFn: (localUri: string) => {
      if (!userId) throw new Error('You need to sign in again before adding a photo');

      return PetPhotoService.add({ petId, userId, localUri });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pet-photos', petId] });
    }
  });
}

export function useDeletePetPhoto(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { photoId: string; photoUrl: string }) => PetPhotoService.remove(input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['pet-photos', petId] });
      invalidateCover(queryClient, petId);
    }
  });
}

export function useSetCoverPhoto(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (publicUrl: string) => PetService.setPhotoUrl(petId, publicUrl),
    onSuccess: () => invalidateCover(queryClient, petId)
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

      const publicUrl = await PetPhotoService.uploadCover({ userId, localUri });
      await PetService.setPhotoUrl(petId, publicUrl);
      await PetPhotoService.removeByPublicUrl(previousUrl);
    },
    onSuccess: () => invalidateCover(queryClient, petId)
  });
}
