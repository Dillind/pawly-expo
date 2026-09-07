import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { userFacingMessage } from '@/lib/errors';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import UserService from '@/services/user.service';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Answers "free to take" for one candidate. The caller debounces, so this is
 * only asked once the Member stops typing.
 *
 * `staleTime` is zero on purpose: a handle someone else claims a second later
 * has to come back as taken, and the write is guarded by a unique index anyway.
 */
export function useUsernameAvailable(candidate: string | undefined) {
  return useQuery({
    queryKey: ['username-available', candidate],
    queryFn: () => UserService.isUsernameAvailable(candidate as string),
    enabled: Boolean(candidate),
    staleTime: 0,
    // One entry per candidate the Member pauses on. Without a bound, a long
    // session of trying handles keeps every answer for the default five
    // minutes, and none of them is worth re-reading anyway.
    gcTime: 30_000
  });
}

export function useUpdateUsername() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    mutationFn: (username: string) => UserService.updateUsername(userId as string, username),
    onSettled: () => {
      // Every surface that names a person reads the handle, not just Profile.
      void queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      void queryClient.invalidateQueries({ queryKey: ['household-members'] });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onSuccess: () => showSuccessToast(SuccessMessage.UsernameSaved),
    onError: (error) => {
      console.error(error);
      showErrorToast(userFacingMessage(error, ErrorMessage.UsernameSaveFailed));
    }
  });
}
