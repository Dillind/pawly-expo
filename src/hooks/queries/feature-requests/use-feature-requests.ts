import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import FeatureRequestService, {
  type FeatureRequest,
  type FeatureRequestsCursor,
  type FeatureRequestSort
} from '@/services/feature-request.service';

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
    queryKey: queryKeys.featureRequests.list(sort, reportedOnly),
    queryFn: ({ pageParam }) =>
      FeatureRequestService.list({ sort, reportedOnly, cursor: pageParam }),
    initialPageParam: null as FeatureRequestsCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => dedupeRequests(data.pages),
    // A sort switch keeps the old rows until the new order lands; LegendList warns when emptied mid-render.
    placeholderData: (previous, previousQuery) => {
      const [, , , previousReportedOnly] = previousQuery?.queryKey ?? [];
      return previousReportedOnly === reportedOnly ? previous : undefined;
    },
    // A report push opens this list, and a cached "Nothing to review" hides the report.
    staleTime: reportedOnly ? 0 : undefined,
    enabled
  });
}

export function useFeatureRequest(requestId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.featureRequests.detail(requestId),
    queryFn: () => FeatureRequestService.get(requestId as string),
    enabled: Boolean(requestId)
  });
}

// Uncached for the same reason as the Reported list: a report push must not open onto a stale badge.
export function useReportedFeatureRequestCount(isTeam: boolean) {
  return useQuery({
    queryKey: queryKeys.featureRequests.reportedCount,
    queryFn: FeatureRequestService.countReported,
    enabled: isTeam,
    staleTime: 0
  });
}

export function useIsCrumpetTeam() {
  return useQuery({
    queryKey: queryKeys.featureRequests.isTeam,
    queryFn: FeatureRequestService.isCrumpetTeam,
    staleTime: Infinity
  });
}

export function useIsBoardBanned() {
  return useQuery({
    queryKey: queryKeys.featureRequests.isBanned,
    queryFn: FeatureRequestService.isBanned
  });
}
