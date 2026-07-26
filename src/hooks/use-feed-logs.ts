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

type FeedLogsCursor = { loggedAt: string; id: string };

async function fetchFeedLogsPage(petId: string, cursor: FeedLogsCursor | null): Promise<FeedLog[]> {
  let query = supabase
    .from('feed_logs')
    .select(FEED_LOG_SELECT)
    .eq('pet_id', petId)
    .order('logged_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(FEED_LOGS_PAGE_SIZE);

  // Compound cursor, not a bare `logged_at < cursor`. Backdated edits compose
  // logged_at from a picked time rather than now(), so two logs landing on the
  // identical instant is ordinary -- and a strict inequality on logged_at alone
  // would skip the tied row past a page boundary entirely, so it appears on no
  // page at all. Same reason the slot matcher tiebreaks on log_id.
  // Values are double-quoted because a timestamptz contains `:` and `+`, which
  // are PostgREST filter syntax.
  if (cursor) {
    query = query.or(
      `logged_at.lt."${cursor.loggedAt}",and(logged_at.eq."${cursor.loggedAt}",id.lt.${cursor.id})`
    );
  }

  const { data, error } = await query;

  if (error) throw error;

  // No generated database.types.ts exists, so the untyped client infers the
  // `users` embed as to-many from the select string alone -- it has no FK
  // metadata to know feed_logs.logged_by -> users.id is to-one. The row shape
  // at runtime is the hand-written FeedLogRow; the cast through `unknown` is
  // the documented escape for that gap, not a loosening of the row type.
  return (data as unknown as FeedLogRow[]).map(mapFeedLogRow);
}

/** Activity's list. Cursor on `(logged_at, id) desc`, 30 per page. */
export function useFeedLogs(petId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['feed-logs', petId],
    queryFn: ({ pageParam }) => fetchFeedLogsPage(petId as string, pageParam),
    initialPageParam: null as FeedLogsCursor | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < FEED_LOGS_PAGE_SIZE) return null;

      const last = lastPage[lastPage.length - 1];

      return { loggedAt: last.loggedAt, id: last.id };
    },
    enabled: Boolean(petId)
  });
}
