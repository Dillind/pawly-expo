import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import FollowService, { type RequestFollowStatus } from '@/services/follow.service';

export const followingKey = ['following'];

const previewKey = (householdId: string | undefined) => ['follow-preview', householdId];
const searchKeyRoot = ['household-search'];
const searchKey = (term: string) => [...searchKeyRoot, term];
const followersKey = (householdId: string | undefined) => ['followers', householdId];
const requestsKey = (householdId: string | undefined) => ['follow-requests', householdId];

/** What a follow link is offering. Its own query, so the route survives a cold start. */
export function useFollowPreview(householdId: string | undefined) {
  return useQuery({
    queryKey: previewKey(householdId),
    queryFn: () => FollowService.preview(householdId as string),
    enabled: Boolean(householdId),
    retry: false
  });
}

/** The shortest term the RPC will answer. Below it the screen shows its prompt. */
export const SEARCH_MIN_LENGTH = 2;

export function useHouseholdSearch(term: string) {
  const query = term.trim();

  return useQuery({
    queryKey: searchKey(query),
    queryFn: () => FollowService.search(query),
    enabled: query.length >= SEARCH_MIN_LENGTH,
    // The previous rows stay on screen while the next term resolves, so the
    // list narrows rather than blanking between keystrokes.
    placeholderData: keepPreviousData,
    staleTime: 30_000
  });
}

export function useFollowing() {
  return useQuery({
    queryKey: followingKey,
    queryFn: () => FollowService.listFollowing()
  });
}

/**
 * The household ids the Posts stream may add to the member scope. Accepted
 * only -- a pending request shows on the Following list and nowhere else.
 */
export function useFollowedHouseholdIds(): string[] {
  const { data: following = [] } = useFollowing();

  return following
    .filter((household) => household.status === 'accepted')
    .map((household) => household.householdId);
}

export function useFollowers(householdId: string | undefined) {
  return useQuery({
    queryKey: followersKey(householdId),
    queryFn: () => FollowService.listFollowers(householdId as string),
    enabled: Boolean(householdId)
  });
}

export function useFollowRequests(householdId: string | undefined) {
  return useQuery({
    queryKey: requestsKey(householdId),
    queryFn: () => FollowService.listRequests(householdId as string),
    enabled: Boolean(householdId)
  });
}

// A refusal is not an error, so each one names itself. 'blocked' deliberately
// reads as an ordinary failure: a removed person is never told they were
// removed.
const REQUEST_REFUSALS: Partial<Record<RequestFollowStatus, string>> = {
  already_member: ErrorMessage.FollowAlreadyMember,
  blocked: ErrorMessage.FollowRequestFailed,
  not_found: ErrorMessage.FollowNotFound
};

export function useRequestFollow(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => FollowService.request(householdId as string),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: previewKey(householdId) });
      void queryClient.invalidateQueries({ queryKey: followingKey });
      void queryClient.invalidateQueries({ queryKey: searchKeyRoot });
    },
    onSuccess: (status) => {
      const refusal = REQUEST_REFUSALS[status];

      if (refusal) return showErrorToast(refusal);

      showSuccessToast(SuccessMessage.FollowRequested);
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.FollowRequestFailed);
    }
  });
}

export function useUnfollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (householdId: string) => FollowService.unfollow(householdId),
    onSettled: (_data, _error, householdId) => {
      void queryClient.invalidateQueries({ queryKey: previewKey(householdId) });
      void queryClient.invalidateQueries({ queryKey: followingKey });
      void queryClient.invalidateQueries({ queryKey: searchKeyRoot });
      // Their posts leave the stream with the follow.
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onSuccess: () => showSuccessToast(SuccessMessage.Unfollowed),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.UnfollowFailed);
    }
  });
}

export function useRespondToFollowRequest(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { followId: string; accept: boolean }) => FollowService.respond(input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: requestsKey(householdId) });
      void queryClient.invalidateQueries({ queryKey: followersKey(householdId) });
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
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.FollowRespondFailed);
    }
  });
}

export function useRemoveFollower(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (followId: string) => FollowService.remove(followId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: followersKey(householdId) });
    },
    onSuccess: (status) => {
      if (status !== 'removed') return showErrorToast(ErrorMessage.FollowerRemoveFailed);

      showSuccessToast(SuccessMessage.FollowerRemoved);
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.FollowerRemoveFailed);
    }
  });
}
