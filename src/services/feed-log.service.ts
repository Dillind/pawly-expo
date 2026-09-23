import { dayInTimezone, shiftDays } from '@/lib/dates';
import { assertWrote } from '@/lib/supabase/assert-wrote';
import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/unwrap';
import type { FeedingScheduleLabel, FeedLog } from '@/types/core';
import type { Rpc } from '@/types/database-overrides';

// Null when the author deleted their account.
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

export type LogFeedResult =
  | { status: 'logged'; logId: string; isExtraFeed: boolean }
  | {
      status: 'double_feed';
      occurrence: { label: FeedingScheduleLabel; localTime: string };
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
    author: row.users
      ? {
          firstName: row.users.first_name,
          lastName: row.users.last_name
        }
      : null
  };
}

// The RPC returns jsonb, which supabase-js hands back as `any`. Mapped here so
// one place knows the wire shape and an unknown status fails loudly.
function mapLogFeedResult(payload: Rpc<'log_feed'>): LogFeedResult {
  if (payload.status === 'logged' && payload.log_id) {
    return {
      status: 'logged',
      logId: payload.log_id,
      isExtraFeed: payload.is_extra_feed ?? false
    };
  }

  if (payload.status === 'double_feed' && payload.occurrence && payload.existing) {
    return {
      status: 'double_feed',
      occurrence: { label: payload.occurrence.label, localTime: payload.occurrence.local_time },
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
  export async function getById(logId: string): Promise<FeedLog> {
    const data = await unwrap(
      supabase.from('feed_logs').select(FEED_LOG_SELECT).eq('id', logId).single()
    );

    return mapFeedLogRow(data);
  }

  export async function getOffScheduleForDay(
    petId: string,
    day: string,
    timezone: string
  ): Promise<FeedLog[]> {
    const data = await unwrap(
      supabase
        .from('feed_logs')
        .select(FEED_LOG_SELECT)
        .eq('pet_id', petId)
        .is('feed_time_series_id', null)
        .gte('logged_at', `${shiftDays(day, -1)}T00:00:00Z`)
        .lt('logged_at', `${shiftDays(day, 2)}T00:00:00Z`)
        .order('logged_at', { ascending: true })
    );

    return data.map(mapFeedLogRow).filter((log) => dayInTimezone(log.loggedAt, timezone) === day);
  }

  // The only write path for a feed log: the check and the insert share one
  // transaction. A `double_feed` result means nothing was written; call again
  // with `confirmed: true` to write it as an Extra Feed.
  export async function log(
    petId: string,
    input: {
      loggedAt?: string;
      notes?: string | null;
      confirmed?: boolean;
      seriesId?: string | null;
      occurrenceDate?: string | null;
    }
  ): Promise<LogFeedResult> {
    const data = await unwrap(
      supabase.rpc('log_feed', {
        target_pet_id: petId,
        target_logged_at: input.loggedAt ?? new Date().toISOString(),
        target_notes: input.notes ?? null,
        confirmed: input.confirmed ?? false,
        target_series_id: input.seriesId ?? null,
        target_occurrence_date: input.occurrenceDate ?? null
      })
    );

    return mapLogFeedResult(data);
  }

  // Only the keys passed are written: a notes-only edit must not touch
  // logged_at, even by re-writing its current value.
  export async function update(input: {
    logId: string;
    loggedAt?: string;
    notes?: string | null;
  }): Promise<void> {
    const patch: { logged_at?: string; notes?: string | null } = {};

    if (input.loggedAt !== undefined) patch.logged_at = input.loggedAt;
    if (input.notes !== undefined) patch.notes = input.notes;

    const data = await unwrap(
      supabase.from('feed_logs').update(patch).eq('id', input.logId).select('id')
    );

    assertWrote(data, 'This feed log can no longer be edited');
  }

  export async function remove(logId: string): Promise<void> {
    await unwrap(supabase.from('feed_logs').delete().eq('id', logId));
  }
}

export default FeedLogService;
