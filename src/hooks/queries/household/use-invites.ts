import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import InviteService, { type RedeemStatus } from '@/services/invite.service';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import { useAuthStore } from '@/stores/auth-store';
import type { HouseholdRole } from '@/types/core';

export function usePendingInvites(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pendingInvites(householdId),
    queryFn: () => InviteService.listPending(householdId as string),
    enabled: Boolean(householdId)
  });
}

export function useInvitePreview(code: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invitePreview(code),
    queryFn: () => InviteService.preview(code as string),
    enabled: Boolean(code),
    retry: false
  });
}

export function useCreateInvite(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.InviteSendFailed },
    mutationFn: (input: { email: string; role: HouseholdRole }) =>
      InviteService.create({ householdId: householdId as string, ...input }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingInvites(householdId) }),
    onSuccess: (result) => {
      if (result.status === 'already_member') {
        return showErrorToast(ErrorMessage.InviteAlreadyMember);
      }

      if (result.status === 'not_owner') return showErrorToast(ErrorMessage.InviteSendFailed);

      // Deliberately says nothing about whether the address has an account.
      showSuccessToast(SuccessMessage.InviteSent);
    }
  });
}

export function useRevokeInvite(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.InviteRevoked,
      errorMessage: ErrorMessage.InviteRevokeFailed
    },
    mutationFn: (inviteId: string) => InviteService.revoke(inviteId),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingInvites(householdId) })
  });
}

const REDEEM_FAILURES: Partial<Record<RedeemStatus, string>> = {
  already_member: ErrorMessage.InviteAlreadyMember,
  already_used: ErrorMessage.InviteAlreadyUsed,
  expired: ErrorMessage.InviteExpired,
  revoked: ErrorMessage.InviteWasRevoked,
  not_found: ErrorMessage.InviteNotFound,
  not_signed_in: ErrorMessage.InviteNotFound
};

// Accepting makes the new household active and says so: a household changing
// unannounced reads as a bug.
export function useRedeemInvite() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const { setActiveHousehold } = useActiveHouseholdStore();

  return useMutation({
    meta: { errorMessage: ErrorMessage.InviteJoinFailed },
    mutationFn: (input: { code?: string; inviteId?: string }) => InviteService.redeem(input),
    onSuccess: async (result) => {
      const failure = REDEEM_FAILURES[result.status];

      if (failure) return showErrorToast(failure);
      if (result.status !== 'joined' || !result.householdId) return;

      // Refetch first: useHousehold heals an id it cannot find by falling back
      // to the first household, so a stale list overwrites this.
      await queryClient.refetchQueries({ queryKey: queryKeys.households.of(userId) });
      await setActiveHousehold(result.householdId);

      showSuccessToast(SuccessMessage.HouseholdJoined);
    }
  });
}
