import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import FollowService, { type RequestFollowStatus } from '@/services/follow.service';

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
  not_found: ErrorMessage.FollowNotFound
};

export function useRequestFollow(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.FollowRequestFailed },
    mutationFn: () => FollowService.request(householdId as string),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.follow.preview(householdId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.follow.following });
      void queryClient.invalidateQueries({ queryKey: queryKeys.follow.searchAll });
    },
    onSuccess: (status) => {
      const refusal = REQUEST_REFUSALS[status];

      if (refusal) return showErrorToast(refusal);

      showSuccessToast(SuccessMessage.FollowRequested);
    }
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
