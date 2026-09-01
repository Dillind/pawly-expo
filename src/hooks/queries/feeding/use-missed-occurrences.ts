import FeedTimeService from '@/services/feed-time.service';
import type { FeedingScheduleLabel, Occurrence } from '@/types/core';
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

const OCCURRENCES_STALE_MS = 15_000;

export type MissedOccurrence = { petId: string; occurrence: Occurrence };

export type DayOccurrences = {
  /** Every feed nobody logged, over the days asked for. */
  missed: MissedOccurrence[];
  /**
   * Which feed time a given log satisfied. A `feed_logs` row carries no label,
   * so this is the only thing that lets a row say "morning feed" rather than
   * just "feed".
   */
  labelByLogId: Map<string, FeedingScheduleLabel>;
};

/**
 * The occurrence state of a set of pets over a set of days.
 *
 * Activity reads `feed_logs`, which by definition holds only feeds that were
 * logged — a missed one has no row there and cannot be joined in. The state
 * comes from `pet_occurrence_states`, one call per pet per day, which is why
 * this is `useQueries` rather than a single query.
 *
 * The key is the same `['occurrences', petId, date]` the pet screens use, so a
 * day already fetched by Home or Pet detail is served from cache rather than
 * fetched twice.
 */
export function useMissedOccurrences(petIds: string[], days: string[]): DayOccurrences {
  const pairs = useMemo(
    () => days.flatMap((date) => petIds.map((petId) => ({ petId, date }))),
    [days, petIds]
  );

  return useQueries({
    queries: pairs.map(({ petId, date }) => ({
      queryKey: ['occurrences', petId, date],
      queryFn: () => FeedTimeService.getOccurrences(petId, date),
      staleTime: OCCURRENCES_STALE_MS
    })),
    combine: (results): DayOccurrences => {
      const missed: MissedOccurrence[] = [];
      const labelByLogId = new Map<string, FeedingScheduleLabel>();

      results.forEach((result, index) => {
        const pair = pairs[index];
        if (!result.data || !pair) return;

        for (const occurrence of result.data) {
          if (occurrence.state === 'missed') {
            missed.push({ petId: pair.petId, occurrence });
          } else if (occurrence.satisfyingLogId) {
            labelByLogId.set(occurrence.satisfyingLogId, occurrence.label);
          }
        }
      });

      return { missed, labelByLogId };
    }
  });
}
