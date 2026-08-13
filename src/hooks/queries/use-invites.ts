import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import InviteService, { type RedeemStatus } from '@/services/invite.service';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import { useAuthStore } from '@/stores/auth-store';
import type { HouseholdRole } from '@/types/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const pendingKey = (householdId: string | undefined) => ['invites-pending', householdId];
const receivedKey = (userId: string | undefined) => ['invites-received', userId];

/** Outstanding invites for a household. Owner-only by RLS. */
export function usePendingInvites(householdId: string | undefined) {
  return useQuery({
    queryKey: pendingKey(householdId),
    queryFn: () => InviteService.listPending(householdId as string),
    enabled: Boolean(householdId)
  });
}

/** Invites waiting for the signed-in user, wherever they came from. */
export function useReceivedInvites() {
  const { userId } = useAuthStore();

  return useQuery({
    queryKey: receivedKey(userId),
    queryFn: () => InviteService.listReceived(userId as string),
    enabled: Boolean(userId)
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
  revoked: ErrorMessage.InviteRevoked,
  not_found: ErrorMessage.InviteNotFound,
  not_signed_in: ErrorMessage.InviteNotFound
};

/**
 * Accepting lands the user in the new household straight away — that is why
 * they accepted — but the switch is announced by a toast rather than being
 * silent. A household changing under someone with no explanation is the
 * original bug this whole body of work came from.
 */
export function useRedeemInvite() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const { setActiveHousehold } = useActiveHouseholdStore();

  return useMutation({
    mutationFn: (input: { code?: string; inviteId?: string }) => InviteService.redeem(input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: receivedKey(userId) }),
    onSuccess: async (result) => {
      const failure = REDEEM_FAILURES[result.status];

      if (failure) return showErrorToast(failure);
      if (result.status !== 'joined' || !result.householdId) return;

      // Refetch BEFORE storing the id, not after. useHousehold heals a stored
      // id it cannot find by falling back to the first household — so setting
      // the new id while the list is still stale gets it overwritten, and the
      // join looks like it did nothing.
      await queryClient.refetchQueries({ queryKey: ['households', userId] });
      await setActiveHousehold(result.householdId);

      showSuccessToast(SuccessMessage.HouseholdJoined);
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.InviteNotFound);
    }
  });
}

export function useDeclineInvite() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    mutationFn: (inviteId: string) => InviteService.decline(inviteId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: receivedKey(userId) }),
    onSuccess: () => showSuccessToast(SuccessMessage.InviteDeclined),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.InviteNotFound);
    }
  });
}
