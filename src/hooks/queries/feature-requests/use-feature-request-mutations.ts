import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { UserFacingError } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { showErrorToast } from '@/lib/toast';
import FeatureRequestService, {
  FeatureRequestCreateError,
  type FeatureRequest,
  type FeatureRequestsPage,
  type FeatureRequestStatus
} from '@/services/feature-request.service';
import { useAuthStore } from '@/stores/auth-store';

type ListData = { pages: FeatureRequestsPage[]; pageParams: unknown[] };

export const applyToEveryList = (
  data: ListData | undefined,
  requestId: string,
  apply: (request: FeatureRequest) => FeatureRequest
): ListData | undefined =>
  data
    ? {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          requests: page.requests.map((request) =>
            request.id === requestId ? apply(request) : request
          )
        }))
      }
    : data;

const writeEverywhere = (
  client: QueryClient,
  requestId: string,
  apply: (request: FeatureRequest) => FeatureRequest
) => {
  client.setQueriesData<ListData>({ queryKey: queryKeys.featureRequests.lists }, (old) =>
    applyToEveryList(old, requestId, apply)
  );
  client.setQueryData<FeatureRequest | null>(queryKeys.featureRequests.detail(requestId), (old) =>
    old ? apply(old) : old
  );
};

const invalidateBoard = (client: QueryClient) =>
  client.invalidateQueries({ queryKey: queryKeys.featureRequests.all });

export const toggleVote = (request: FeatureRequest): FeatureRequest => ({
  ...request,
  hasVoted: !request.hasVoted,
  voteCount: request.voteCount + (request.hasVoted ? -1 : 1)
});

// Silent on success: the filled box is the confirmation. The order is left alone
// until the next refetch, so a card never jumps away from the thumb that tapped it.
export function useToggleVote() {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    meta: { errorMessage: ErrorMessage.FeatureRequestVoteFailed },
    mutationFn: ({ requestId, hasVoted }: { requestId: string; hasVoted: boolean }) => {
      if (!userId) throw new UserFacingError('You need to sign in again before voting');

      return hasVoted
        ? FeatureRequestService.removeVote({ requestId, userId })
        : FeatureRequestService.vote({ requestId, userId });
    },
    onMutate: async ({ requestId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.featureRequests.all });
      writeEverywhere(queryClient, requestId, toggleVote);
    },
    onError: (_error, { requestId }) => writeEverywhere(queryClient, requestId, toggleVote)
  });
}

export function useCreateFeatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: SuccessMessage.FeatureRequestPosted },
    mutationFn: FeatureRequestService.create,
    onSuccess: () => invalidateBoard(queryClient),
    onError: (error) => {
      // The form shows these inline, under the field that caused them.
      if (!(error instanceof FeatureRequestCreateError)) {
        showErrorToast(ErrorMessage.FeatureRequestPostFailed);
      }
    }
  });
}

export function useDeleteFeatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.FeatureRequestDeleted,
      errorMessage: ErrorMessage.FeatureRequestDeleteFailed
    },
    mutationFn: FeatureRequestService.remove,
    onSuccess: (_data, requestId) => {
      queryClient.setQueryData(queryKeys.featureRequests.detail(requestId), null);
      void invalidateBoard(queryClient);
    }
  });
}

export function useReportFeatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.FeatureRequestReported,
      errorMessage: ErrorMessage.FeatureRequestReportFailed
    },
    mutationFn: FeatureRequestService.report,
    onSuccess: () => invalidateBoard(queryClient)
  });
}

export function useHideFeatureRequestAuthor() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.FeatureRequestAuthorHidden,
      errorMessage: ErrorMessage.FeatureRequestHideFailed
    },
    mutationFn: FeatureRequestService.blockAuthor,
    onSuccess: () => invalidateBoard(queryClient)
  });
}

export function useSetFeatureRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.FeatureRequestStatusChanged,
      errorMessage: ErrorMessage.FeatureRequestStatusFailed
    },
    mutationFn: FeatureRequestService.setStatus,
    onMutate: ({ requestId, status }: { requestId: string; status: FeatureRequestStatus }) => {
      writeEverywhere(queryClient, requestId, (request) => ({ ...request, status }));
    },
    onSettled: () => invalidateBoard(queryClient)
  });
}

export function useRestoreFeatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.FeatureRequestRestored,
      errorMessage: ErrorMessage.FeatureRequestRestoreFailed
    },
    mutationFn: FeatureRequestService.restore,
    onSuccess: () => invalidateBoard(queryClient)
  });
}
