import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import HouseholdService, { type MembershipStatus } from '@/services/household.service';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import { useAuthStore } from '@/stores/auth-store';
import type { HouseholdRole } from '@/types/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * The RPCs answer with a status rather than throwing, so a refused change
 * arrives as a successful call. Everything that is not the happy path is
 * turned into a toast here, once, rather than at each call site.
 */
const failureFor = (status: MembershipStatus, fallback: string): string | undefined => {
  if (status === 'last_owner') return ErrorMessage.LastOwner;
  if (status === 'not_owner' || status === 'not_a_member' || status === 'use_leave')
    return fallback;

  return undefined;
};

function useMembershipQueries() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return (householdId: string) => {
    void queryClient.invalidateQueries({ queryKey: ['households', userId] });
    void queryClient.invalidateQueries({ queryKey: ['household-members', householdId] });
  };
}

export function useSetMemberRole(householdId: string | undefined) {
  const invalidate = useMembershipQueries();

  return useMutation({
    mutationFn: (input: { userId: string; role: HouseholdRole }) =>
      HouseholdService.setMemberRole({ householdId: householdId as string, ...input }),
    onSettled: () => invalidate(householdId as string),
    onSuccess: (status) => {
      const failure = failureFor(status, ErrorMessage.MemberRoleChangeFailed);

      if (failure) return showErrorToast(failure);
      if (status === 'changed') showSuccessToast(SuccessMessage.MemberRoleChanged);
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.MemberRoleChangeFailed);
    }
  });
}

export function useRemoveMember(householdId: string | undefined) {
  const invalidate = useMembershipQueries();

  return useMutation({
    mutationFn: (userId: string) =>
      HouseholdService.removeMember({ householdId: householdId as string, userId }),
    onSettled: () => invalidate(householdId as string),
    onSuccess: (status) => {
      const failure = failureFor(status, ErrorMessage.MemberRemoveFailed);

      if (failure) return showErrorToast(failure);
      if (status === 'removed') showSuccessToast(SuccessMessage.MemberRemoved);
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.MemberRemoveFailed);
    }
  });
}

export function useLeaveHousehold(householdId: string | undefined) {
  const invalidate = useMembershipQueries();
  const { setActiveHousehold } = useActiveHouseholdStore();

  return useMutation({
    mutationFn: () => HouseholdService.leave(householdId as string),
    onSettled: () => invalidate(householdId as string),
    onSuccess: (status) => {
      const failure = failureFor(status, ErrorMessage.HouseholdLeaveFailed);

      if (failure) return showErrorToast(failure);
      if (status !== 'left') return;

      showSuccessToast(SuccessMessage.HouseholdLeft);
      // The stored id now points at a household that is gone. useHousehold
      // would fall back on its own, but clearing it here means the fallback
      // never renders the household the user has just left.
      void setActiveHousehold('');
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.HouseholdLeaveFailed);
    }
  });
}
