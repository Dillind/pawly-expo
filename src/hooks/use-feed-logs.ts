import { supabase } from '@/lib/supabase/client';
import type { FeedLog } from '@/types/core';
import { useInfiniteQuery } from '@tanstack/react-query';

export const FEED_LOGS_PAGE_SIZE = 30;

// feed_logs.logged_by references public.users, so PostgREST can embed the
// author directly. It is null when the author deleted their account.
export const FEED_LOG_SELECT =
  'id, pet_id, logged_by, logged_at, notes, created_at, users(first_name, last_name)';

export type FeedLogRow = {
  id: string;
  pet_id: string;
  logged_by: string | null;
  logged_at: string;
  notes: string | null;
  created_at: string;
  users: { first_name: string | null; last_name: string | null } | null;
};

export function mapFeedLogRow(row: FeedLogRow): FeedLog {
  return {
    id: row.id,
    petId: row.pet_id,
    loggedBy: row.logged_by,
    loggedAt: row.logged_at,
    notes: row.notes,
    createdAt: row.created_at,
    author: row.users
      ? { firstName: row.users.first_name, lastName: row.users.last_name }
      : null
  };
}

async function fetchFeedLogsPage(petId: string, cursor: string | null): Promise<FeedLog[]> {
  let query = supabase
    .from('feed_logs')
    .select(FEED_LOG_SELECT)
    .eq('pet_id', petId)
    .order('logged_at', { ascending: false })
    .limit(FEED_LOGS_PAGE_SIZE);

  if (cursor) query = query.lt('logged_at', cursor);

  const { data, error } = await query;

  if (error) throw error;

  // No generated database.types.ts exists, so the untyped client infers the
  // `users` embed as to-many from the select string alone -- it has no FK
  // metadata to know feed_logs.logged_by -> users.id is to-one. The row shape
  // at runtime is the hand-written FeedLogRow; the cast through `unknown` is
  // the documented escape for that gap, not a loosening of the row type.
  return (data as unknown as FeedLogRow[]).map(mapFeedLogRow);
}

/** Activity's list. Cursor on `logged_at desc`, 30 per page. */
export function useFeedLogs(petId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['feed-logs', petId],
    queryFn: ({ pageParam }) => fetchFeedLogsPage(petId as string, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.length === FEED_LOGS_PAGE_SIZE ? lastPage[lastPage.length - 1].loggedAt : null,
    enabled: Boolean(petId)
  });
}
