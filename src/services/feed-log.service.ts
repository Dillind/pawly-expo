import { supabase } from '@/lib/supabase/client';
import type { FeedingScheduleLabel, FeedLog } from '@/types/core';

export const FEED_LOGS_PAGE_SIZE = 30;

// feed_logs.logged_by references public.users, so PostgREST can embed the
// author directly. It is null when the author deleted their account.
const FEED_LOG_SELECT =
  'id, pet_id, logged_by, logged_at, notes, created_at, users(first_name, last_name)';

type FeedLogRow = {
  id: string;
  pet_id: string;
  logged_by: string | null;
  logged_at: string;
  notes: string | null;
  created_at: string;
  users: { first_name: string | null; last_name: string | null } | null;
};

export type FeedLogsCursor = { loggedAt: string; id: string };

export type LogFeedResult =
  | { status: 'logged'; logId: string }
  | {
      status: 'double_feed';
      slot: { label: FeedingScheduleLabel; scheduledTime: string };
      existing: { id: string; loggedAt: string; loggedBy: string | null };
    };

function mapFeedLogRow(row: FeedLogRow): FeedLog {
  return {
    id: row.id,
    petId: row.pet_id,
    loggedBy: row.logged_by,
    loggedAt: row.logged_at,
    notes: row.notes,
    createdAt: row.created_at,
    author: row.users ? { firstName: row.users.first_name, lastName: row.users.last_name } : null
  };
}

/**
 * The RPC returns jsonb, which supabase-js hands back as `any`. Mapped here so
 * exactly one place knows the wire shape, and an unrecognised status fails
 * loudly instead of rendering an empty warning.
 */
function mapLogFeedResult(data: unknown): LogFeedResult {
  const payload = data as {
    status?: string;
    log_id?: string;
    slot?: { label: FeedingScheduleLabel; scheduled_time: string };
    existing?: { id: string; logged_at: string; logged_by: string | null };
  };

  if (payload.status === 'logged' && payload.log_id) {
    return { status: 'logged', logId: payload.log_id };
  }

  if (payload.status === 'double_feed' && payload.slot && payload.existing) {
    return {
      status: 'double_feed',
      slot: { label: payload.slot.label, scheduledTime: payload.slot.scheduled_time },
      existing: {
        id: payload.existing.id,
        loggedAt: payload.existing.logged_at,
        loggedBy: payload.existing.logged_by
      }
    };
  }

  throw new Error('Unrecognised log_feed response');
}

namespace FeedLogService {
  export async function listPage(
    petIds: string[],
    cursor: FeedLogsCursor | null
  ): Promise<FeedLog[]> {
    let query = supabase
      .from('feed_logs')
      .select(FEED_LOG_SELECT)
      .in('pet_id', petIds)
      .order('logged_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(FEED_LOGS_PAGE_SIZE);

    // Compound cursor, not a bare `logged_at < cursor`. Backdated edits compose
    // logged_at from a picked time rather than now(), so two logs landing on the
    // identical instant is ordinary -- and a strict inequality on logged_at alone
    // would skip the tied row past a page boundary entirely, so it appears on no
    // page at all. Values are double-quoted because a timestamptz contains `:`
    // and `+`, which are PostgREST filter syntax.
    if (cursor) {
      query = query.or(
        `logged_at.lt."${cursor.loggedAt}",and(logged_at.eq."${cursor.loggedAt}",id.lt.${cursor.id})`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    // No generated database.types.ts exists, so the untyped client infers the
    // `users` embed as to-many from the select string alone -- it has no FK
    // metadata to know feed_logs.logged_by -> users.id is to-one.
    return (data as unknown as FeedLogRow[]).map(mapFeedLogRow);
  }

  export async function getById(logId: string): Promise<FeedLog> {
    const { data, error } = await supabase
      .from('feed_logs')
      .select(FEED_LOG_SELECT)
      .eq('id', logId)
      .single();

    if (error) throw error;

    return mapFeedLogRow(data as unknown as FeedLogRow);
  }

  /**
   * The only write path for a feed log. `log_feed` decides and inserts in one
   * transaction, so two members logging the same slot at the same moment cannot
   * both be told there is no double feed.
   *
   * A `double_feed` result means nothing was written. Calling again with
   * `confirmed: true` writes unconditionally.
   */
  export async function log(
    petId: string,
    input: { loggedAt?: string; notes?: string | null; confirmed?: boolean }
  ): Promise<LogFeedResult> {
    const { data, error } = await supabase.rpc('log_feed', {
      target_pet_id: petId,
      target_logged_at: input.loggedAt ?? new Date().toISOString(),
      target_notes: input.notes ?? null,
      confirmed: input.confirmed ?? false
    });

    if (error) throw error;

    return mapLogFeedResult(data);
  }

  /**
   * Only the keys actually passed are written. The correction sheet relies on
   * this: a notes-only edit must never touch logged_at, even by re-writing its
   * current value.
   */
  export async function update(input: {
    logId: string;
    loggedAt?: string;
    notes?: string | null;
  }): Promise<void> {
    const patch: { logged_at?: string; notes?: string | null } = {};

    if (input.loggedAt !== undefined) patch.logged_at = input.loggedAt;
    if (input.notes !== undefined) patch.notes = input.notes;

    const { error } = await supabase.from('feed_logs').update(patch).eq('id', input.logId);
    if (error) throw error;
  }

  export async function remove(logId: string): Promise<void> {
    const { error } = await supabase.from('feed_logs').delete().eq('id', logId);
    if (error) throw error;
  }
}

export default FeedLogService;
