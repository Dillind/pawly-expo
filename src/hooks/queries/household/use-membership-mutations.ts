import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import HouseholdService, { type MembershipStatus } from '@/services/household.service';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import { useAuthStore } from '@/stores/auth-store';
import type { HouseholdRole } from '@/types/core';

// The RPCs answer with a status rather than throwing, so a refused change arrives as a
// successful call. Everything that is not the happy path is turned into a toast here, once,
// rather than at each call site.
const failureFor = (status: MembershipStatus, fallback: string): string | undefined => {
  if (status === 'last_owner') return ErrorMessage.OwnerRequired;
  if (status === 'not_owner' || status === 'not_a_member' || status === 'use_leave')
    return fallback;

  return undefined;
};

function useInvalidateMembership() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return (householdId: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.households.of(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.householdMembers.of(householdId) });
  };
}

export function useSetMemberRole(householdId: string | undefined) {
  const invalidate = useInvalidateMembership();

  return useMutation({
    meta: { errorMessage: ErrorMessage.MemberRoleChangeFailed },
    mutationFn: (input: { userId: string; role: HouseholdRole }) =>
      HouseholdService.setMemberRole({ householdId: householdId as string, ...input }),
    onSettled: () => invalidate(householdId as string),
    onSuccess: (status) => {
      const failure = failureFor(status, ErrorMessage.MemberRoleChangeFailed);

      if (failure) return showErrorToast(failure);
      if (status === 'changed') showSuccessToast(SuccessMessage.MemberRoleChanged);
    }
  });
}

export function useRemoveMember(householdId: string | undefined) {
  const invalidate = useInvalidateMembership();

  return useMutation({
    meta: { errorMessage: ErrorMessage.MemberRemoveFailed },
    mutationFn: (userId: string) =>
      HouseholdService.removeMember({ householdId: householdId as string, userId }),
    onSettled: () => invalidate(householdId as string),
    onSuccess: (status) => {
      const failure = failureFor(status, ErrorMessage.MemberRemoveFailed);

      if (failure) return showErrorToast(failure);
      if (status === 'removed') showSuccessToast(SuccessMessage.MemberRemoved);
    }
  });
}

export function useLeaveHousehold(householdId: string | undefined) {
  const invalidate = useInvalidateMembership();
  const { activeHouseholdId, clearActiveHousehold } = useActiveHouseholdStore();

  return useMutation({
    meta: { errorMessage: ErrorMessage.HouseholdLeaveFailed },
    mutationFn: () => HouseholdService.leave(householdId as string),
    onSettled: () => invalidate(householdId as string),
    onSuccess: (status) => {
      const failure = failureFor(status, ErrorMessage.HouseholdLeaveFailed);

      if (failure) return showErrorToast(failure);
      if (status !== 'left') return;

      showSuccessToast(SuccessMessage.HouseholdLeft);

      // Members is reachable for any household, not only the active one. Leaving
      // a household you were not looking at must not move you out of the one you
      // were.
      if (householdId === activeHouseholdId) void clearActiveHousehold();
    }
  });
}
