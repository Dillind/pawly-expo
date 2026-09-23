import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { joinedNames } from '@/lib/follow-naming';
import { queryKeys } from '@/lib/query-keys';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import FollowService, {
  type NamedHousehold,
  type RequestFollowStatus
} from '@/services/follow.service';

// Its own query, so the route survives a cold start.
export function useFollowPreview(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.follow.preview(householdId),
    queryFn: () => FollowService.preview(householdId as string),
    enabled: Boolean(householdId),
    retry: false
  });
}

// The shortest term the RPC will answer.
export const SEARCH_MIN_LENGTH = 2;

export function useHouseholdSearch(term: string) {
  const query = term.trim();

  return useQuery({
    queryKey: queryKeys.follow.search(query),
    queryFn: () => FollowService.search(query),
    enabled: query.length >= SEARCH_MIN_LENGTH,
    // Previous rows stay while the next term resolves, so the list narrows.
    placeholderData: keepPreviousData,
    staleTime: 30_000
  });
}

export function useFollowing() {
  return useQuery({
    queryKey: queryKeys.follow.following,
    queryFn: () => FollowService.listFollowing()
  });
}

// Accepted only: a pending request shows on the Following list and nowhere
// else.
export function useFollowedHouseholdIds(): string[] {
  const { data: following = [] } = useFollowing();

  return following
    .filter((household) => household.status === 'accepted')
    .map((household) => household.householdId);
}

export function useFollowers(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.follow.followers(householdId),
    queryFn: () => FollowService.listFollowers(householdId as string),
    enabled: Boolean(householdId)
  });
}

export function useFollowRequests(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.follow.requests(householdId),
    queryFn: () => FollowService.listRequests(householdId as string),
    enabled: Boolean(householdId)
  });
}

// 'blocked' reads as an ordinary failure: a removed person is never told.
const REQUEST_REFUSALS: Partial<Record<RequestFollowStatus, string>> = {
  already_member: ErrorMessage.FollowAlreadyMember,
  blocked: ErrorMessage.FollowRequestFailed,
  not_found: ErrorMessage.FollowNotFound,
  no_household: ErrorMessage.FollowNeedsHousehold
};

type RequestFollowInput = {
  householdId: string;
  namedHouseholdIds: string[];
  // Only for the toast: the RPC keeps the names it may.
  namedHouseholdNames: string[];
};

// One mutation for a whole list; a row compares `variables` to know it is the one sending.
export function useRequestFollow() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.FollowRequestFailed },
    mutationFn: (input: RequestFollowInput) =>
      FollowService.request(input.householdId, input.namedHouseholdIds),
    onSettled: (_status, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.follow.preview(input.householdId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.follow.following });
      void queryClient.invalidateQueries({ queryKey: queryKeys.follow.searchAll });
    },
    onSuccess: (status, input) => {
      const refusal = REQUEST_REFUSALS[status];

      if (refusal) return showErrorToast(refusal);

      showSuccessToast(
        input.namedHouseholdNames.length > 0
          ? `${SuccessMessage.FollowRequested} as ${joinedNames(input.namedHouseholdNames)}`
          : SuccessMessage.FollowRequested
      );
    }
  });
}

// A Follow Back names the Household that accepted, so the other side sees "Following".
// Each Household is answered on its own: one refusal must not hide the others that sent.
export function useFollowBack(acceptingHouseholdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.FollowRequestFailed },
    mutationFn: async (households: NamedHousehold[]) => {
      const results = await Promise.allSettled(
        households.map((household) =>
          FollowService.request(household.householdId, [acceptingHouseholdId as string])
        )
      );
      const sent = households.filter(
        (_, index) =>
          results[index].status === 'fulfilled' &&
          !REQUEST_REFUSALS[(results[index] as PromiseFulfilledResult<RequestFollowStatus>).value]
      );

      if (sent.length === 0) throw new Error('Follow Back refused');

      return sent;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.follow.followers(acceptingHouseholdId)
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.follow.following });
    },
    onSuccess: (sent, households) => {
      showSuccessToast(
        `${SuccessMessage.FollowRequested} to ${joinedNames(sent.map((h) => h.name))}`
      );

      if (sent.length < households.length) showErrorToast(ErrorMessage.FollowRequestFailed);
    }
  });
}

export function useFollowRequestSummary(householdId: string | undefined, isOwner: boolean) {
  return useQuery({
    queryKey: queryKeys.follow.requestSummary(householdId),
    queryFn: () => FollowService.requestSummary(householdId as string),
    enabled: Boolean(householdId) && isOwner
  });
}

// Only the badge refreshes, as with the Inbox rows: the dot stays until the next visit.
export function useMarkFollowRequestAlertsRead(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.AlertsMarkReadFailed },
    mutationFn: () => FollowService.markRequestAlertsRead(householdId as string),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadAlerts(householdId) })
  });
}

export function useUnfollow() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: SuccessMessage.Unfollowed, errorMessage: ErrorMessage.UnfollowFailed },
    mutationFn: (householdId: string) => FollowService.unfollow(householdId),
    onSettled: (_data, _error, householdId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.follow.preview(householdId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.follow.following });
      void queryClient.invalidateQueries({ queryKey: queryKeys.follow.searchAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    }
  });
}

export function useRespondToFollowRequest(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.FollowRespondFailed },
    mutationFn: (input: { followId: string; accept: boolean }) => FollowService.respond(input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.follow.requests(householdId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.follow.followers(householdId) });
    },
    onSuccess: (status) => {
      if (status === 'not_owner') return showErrorToast(ErrorMessage.FollowRespondNotOwner);
      if (status !== 'accepted' && status !== 'declined') {
        return showErrorToast(ErrorMessage.FollowRespondFailed);
      }

      showSuccessToast(
        status === 'accepted'
          ? SuccessMessage.FollowRequestAccepted
          : SuccessMessage.FollowRequestDeclined
      );
    }
  });
}

export function useRemoveFollower(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.FollowerRemoveFailed },
    mutationFn: (followId: string) => FollowService.remove(followId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.follow.followers(householdId) });
    },
    onSuccess: (status) => {
      if (status !== 'removed') return showErrorToast(ErrorMessage.FollowerRemoveFailed);

      showSuccessToast(SuccessMessage.FollowerRemoved);
    }
  });
}
