import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { UserFacingError, userFacingMessage } from '@/lib/errors';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import PetPhotoService from '@/services/pet-photo.service';
import PetService from '@/services/pet.service';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type ChangePetPhotoInput = { localUri: string; previousUrl: string | null };

const invalidateCover = (queryClient: ReturnType<typeof useQueryClient>, petId: string) => {
  void queryClient.invalidateQueries({ queryKey: ['pet-detail', petId] });
  void queryClient.invalidateQueries({ queryKey: ['pet'] });
  void queryClient.invalidateQueries({ queryKey: ['households'] });
};

/** Sequential: `add_pet_photo` derives `sort_order` from existing rows, so concurrent calls race. */
export function useAddPetPhotos(petId: string) {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    mutationFn: async (localUris: string[]) => {
      if (!userId) throw new UserFacingError('You need to sign in again before adding a photo');

      for (const localUri of localUris) {
        await PetPhotoService.add({ petId, userId, localUri });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['pet-photos', petId] });
    },
    onSuccess: (_data, localUris) => {
      showSuccessToast(
        localUris.length === 1 ? SuccessMessage.PhotoAdded : SuccessMessage.PhotosAdded
      );
    },
    onError: (error, localUris) => {
      console.error(error);
      showErrorToast(
        userFacingMessage(
          error,
          localUris.length === 1 ? ErrorMessage.PhotoAddFailed : ErrorMessage.PhotosAddFailed
        )
      );
    }
  });
}

export function useDeletePetPhoto(petId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { photoId: string; photoUrl: string }) => PetPhotoService.remove(data),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['pet-photos', petId] });
      invalidateCover(queryClient, petId);
    },
    onSuccess: () => showSuccessToast(SuccessMessage.PhotoDeleted),
    onError: (error) => {
      console.error(error);
      showErrorToast(userFacingMessage(error, ErrorMessage.PhotoDeleteFailed));
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
      if (!userId) throw new UserFacingError('You need to sign in again before changing the photo');

      const publicUrl = await PetPhotoService.uploadCover({ userId, localUri });
      await PetService.setPhotoUrl(petId, publicUrl);
      await PetPhotoService.removeByPublicUrl(previousUrl);
    },
    onSettled: () => invalidateCover(queryClient, petId),
    onSuccess: () => showSuccessToast(SuccessMessage.PetPhotoUpdated),
    onError: (error) => {
      console.error(error);
      showErrorToast(userFacingMessage(error, ErrorMessage.PetPhotoUpdateFailed));
    }
  });
}
