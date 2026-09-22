import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import FeatureRequestService, {
  type FeatureRequest,
  type FeatureRequestsCursor,
  type FeatureRequestSort
} from '@/services/feature-request.service';

export const ALL_FEATURE_REQUESTS = ['feature-requests'];

export const featureRequestKey = (requestId: string) => ['feature-request', requestId];

// A vote moves a request across a page boundary, so the same id can arrive twice.
export const dedupeRequests = (pages: { requests: FeatureRequest[] }[]): FeatureRequest[] => {
  const seen = new Set<string>();

  return pages
    .flatMap((page) => page.requests)
    .filter((request) => {
      if (seen.has(request.id)) return false;
      seen.add(request.id);
      return true;
    });
};

export function useFeatureRequests(
  sort: FeatureRequestSort,
  reportedOnly: boolean,
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: [...ALL_FEATURE_REQUESTS, sort, reportedOnly],
    queryFn: ({ pageParam }) =>
      FeatureRequestService.list({ sort, reportedOnly, cursor: pageParam }),
    initialPageParam: null as FeatureRequestsCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => dedupeRequests(data.pages),
    // A sort switch keeps the old rows until the new order lands; LegendList warns when emptied mid-render.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === reportedOnly ? previous : undefined,
    // A report push opens this list, and a cached "Nothing to review" hides the report.
    staleTime: reportedOnly ? 0 : undefined,
    enabled
  });
}

export function useFeatureRequest(requestId: string | undefined) {
  return useQuery({
    queryKey: featureRequestKey(requestId ?? ''),
    queryFn: () => FeatureRequestService.get(requestId!),
    enabled: Boolean(requestId)
  });
}

export function useIsCrumpetTeam() {
  return useQuery({
    queryKey: ['crumpet-team'],
    queryFn: FeatureRequestService.isCrumpetTeam,
    staleTime: Infinity
  });
}

export function useIsBoardBanned() {
  return useQuery({
    queryKey: ['feature-board-banned'],
    queryFn: FeatureRequestService.isBanned
  });
}
