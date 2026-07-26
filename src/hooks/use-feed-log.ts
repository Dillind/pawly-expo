import { FEED_LOG_SELECT, mapFeedLogRow, type FeedLogRow } from '@/hooks/use-feed-logs';
import { supabase } from '@/lib/supabase/client';
import type { FeedLog } from '@/types/core';
import { useQuery } from '@tanstack/react-query';

async function fetchFeedLog(logId: string): Promise<FeedLog> {
  const { data, error } = await supabase
    .from('feed_logs')
    .select(FEED_LOG_SELECT)
    .eq('id', logId)
    .single();

  if (error) throw error;

  // See use-feed-logs.ts for why this goes through `unknown` -- the untyped
  // client infers the `users` embed as to-many from the select string alone.
  return mapFeedLogRow(data as unknown as FeedLogRow);
}

/**
 * One log, fetched directly by id. A notification tapped three weeks later
 * points at a log nowhere near page 1, so the deep-linked sheet must not read
 * from the paged list — paging until found is unbounded.
 */
export function useFeedLog(logId: string | undefined) {
  return useQuery({
    queryKey: ['feed-log', logId],
    queryFn: () => fetchFeedLog(logId as string),
    enabled: Boolean(logId)
  });
}
