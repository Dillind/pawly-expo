import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import FeatureRequestService, {
  FeatureRequestCreateError,
  type FeatureRequest,
  type FeatureRequestsPage,
  type FeatureRequestStatus
} from '@/services/feature-request.service';
import { useAuthStore } from '@/stores/auth-store';

import { ALL_FEATURE_REQUESTS, featureRequestKey } from './use-feature-requests';

type Client = ReturnType<typeof useQueryClient>;
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
  client: Client,
  requestId: string,
  apply: (request: FeatureRequest) => FeatureRequest
) => {
  client.setQueriesData<ListData>({ queryKey: ALL_FEATURE_REQUESTS }, (old) =>
    applyToEveryList(old, requestId, apply)
  );
  client.setQueryData<FeatureRequest | null>(featureRequestKey(requestId), (old) =>
    old ? apply(old) : old
  );
};

const invalidateBoard = (client: Client, requestId?: string) => {
  void client.invalidateQueries({ queryKey: ALL_FEATURE_REQUESTS });
  if (requestId) void client.invalidateQueries({ queryKey: featureRequestKey(requestId) });
};

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
    mutationFn: ({ requestId, hasVoted }: { requestId: string; hasVoted: boolean }) =>
      hasVoted
        ? FeatureRequestService.removeVote({ requestId, userId: userId! })
        : FeatureRequestService.vote({ requestId, userId: userId! }),
    onMutate: async ({ requestId }) => {
      await queryClient.cancelQueries({ queryKey: ALL_FEATURE_REQUESTS });
      await queryClient.cancelQueries({ queryKey: featureRequestKey(requestId) });
      writeEverywhere(queryClient, requestId, toggleVote);
    },
    onError: (error, { requestId }) => {
      console.error(error);
      writeEverywhere(queryClient, requestId, toggleVote);
      showErrorToast(ErrorMessage.FeatureRequestVoteFailed);
    }
  });
}

export function useCreateFeatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: FeatureRequestService.create,
    onSuccess: () => {
      invalidateBoard(queryClient);
      showSuccessToast(SuccessMessage.FeatureRequestPosted);
    },
    onError: (error) => {
      // The form shows these inline, under the field that caused them.
      if (error instanceof FeatureRequestCreateError) return;
      console.error(error);
      showErrorToast(ErrorMessage.FeatureRequestPostFailed);
    }
  });
}

export function useDeleteFeatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: FeatureRequestService.remove,
    onSuccess: (_data, requestId) => {
      queryClient.setQueryData(featureRequestKey(requestId), null);
      invalidateBoard(queryClient);
      showSuccessToast(SuccessMessage.FeatureRequestDeleted);
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.FeatureRequestDeleteFailed);
    }
  });
}

export function useReportFeatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: FeatureRequestService.report,
    onSuccess: (_data, requestId) => {
      invalidateBoard(queryClient, requestId);
      showSuccessToast(SuccessMessage.FeatureRequestReported);
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.FeatureRequestReportFailed);
    }
  });
}

export function useHideFeatureRequestAuthor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: FeatureRequestService.blockAuthor,
    onSuccess: (_data, requestId) => {
      invalidateBoard(queryClient, requestId);
      showSuccessToast(SuccessMessage.FeatureRequestAuthorHidden);
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.FeatureRequestHideFailed);
    }
  });
}

export function useSetFeatureRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: FeatureRequestService.setStatus,
    onMutate: ({ requestId, status }: { requestId: string; status: FeatureRequestStatus }) => {
      writeEverywhere(queryClient, requestId, (request) => ({ ...request, status }));
    },
    onSuccess: () => showSuccessToast(SuccessMessage.FeatureRequestStatusChanged),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.FeatureRequestStatusFailed);
    },
    onSettled: (_data, _error, { requestId }) => invalidateBoard(queryClient, requestId)
  });
}

export function useRestoreFeatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: FeatureRequestService.restore,
    onSuccess: (_data, requestId) => {
      invalidateBoard(queryClient, requestId);
      showSuccessToast(SuccessMessage.FeatureRequestRestored);
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.FeatureRequestRestoreFailed);
    }
  });
}
