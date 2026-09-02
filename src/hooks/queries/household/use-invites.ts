import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { householdsKey } from '@/hooks/queries/household/use-households';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import InviteService, { type RedeemStatus } from '@/services/invite.service';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import { useAuthStore } from '@/stores/auth-store';
import type { HouseholdRole } from '@/types/core';

const pendingKey = (householdId: string | undefined) => ['invites-pending', householdId];

/** Outstanding invites for a household. Owner-only by RLS. */
export function usePendingInvites(householdId: string | undefined) {
  return useQuery({
    queryKey: pendingKey(householdId),
    queryFn: () => InviteService.listPending(householdId as string),
    enabled: Boolean(householdId)
  });
}

/** What a scanned or typed code is offering, before anyone commits to it. */
export function useInvitePreview(code: string | undefined) {
  return useQuery({
    queryKey: ['invite-preview', code],
    queryFn: () => InviteService.preview(code as string),
    enabled: Boolean(code),
    retry: false
  });
}

export function useCreateInvite(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { email: string; role: HouseholdRole }) =>
      InviteService.create({ householdId: householdId as string, ...input }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: pendingKey(householdId) }),
    onSuccess: (result) => {
      if (result.status === 'already_member') {
        return showErrorToast(ErrorMessage.InviteAlreadyMember);
      }

      if (result.status === 'not_owner') return showErrorToast(ErrorMessage.InviteSendFailed);

      // Deliberately says nothing about whether the address has an account.
      showSuccessToast(SuccessMessage.InviteSent);
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.InviteSendFailed);
    }
  });
}

export function useRevokeInvite(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) => InviteService.revoke(inviteId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: pendingKey(householdId) }),
    onSuccess: () => showSuccessToast(SuccessMessage.InviteRevoked),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.InviteRevokeFailed);
    }
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

/**
 * Accepting makes the new household active — that is why they accepted — and
 * says so, because a household changing under someone unannounced reads as a
 * bug.
 */
export function useRedeemInvite() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const { setActiveHousehold } = useActiveHouseholdStore();

  return useMutation({
    mutationFn: (input: { code?: string; inviteId?: string }) => InviteService.redeem(input),
    onSuccess: async (result) => {
      const failure = REDEEM_FAILURES[result.status];

      if (failure) return showErrorToast(failure);
      if (result.status !== 'joined' || !result.householdId) return;

      // Refetch before storing the id: useHousehold heals an id it cannot find
      // by falling back to the first household, so a stale list overwrites this.
      await queryClient.refetchQueries({ queryKey: householdsKey(userId) });
      await setActiveHousehold(result.householdId);

      showSuccessToast(SuccessMessage.HouseholdJoined);
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.InviteJoinFailed);
    }
  });
}
