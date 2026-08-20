import { UserFacingError } from '@/lib/errors';
import type { FeedTimeInput } from '@/lib/form/pet-schemas';
import { supabase } from '@/lib/supabase/client';
import type { FeedingScheduleLabel, Occurrence, OccurrenceStateValue } from '@/types/core';

export type FeedTime = {
  seriesId: string;
  localTime: string;
  label: FeedingScheduleLabel;
  daysOfWeek: number[];
  instructions: string | null;
};

const DUPLICATE_LABEL = '23505';

type FeedTimeRow = {
  series_id: string;
  local_time: string;
  label: FeedingScheduleLabel;
  days_of_week: number[];
  instructions: string | null;
};

type OccurrenceRow = {
  series_id: string;
  local_time: string;
  label: FeedingScheduleLabel;
  instructions: string | null;
  scheduled_at: string;
  state: OccurrenceStateValue;
  satisfying_log_id: string | null;
  satisfied_at: string | null;
  satisfied_by: string | null;
};

namespace FeedTimeService {
  /**
   * The versions that apply from tomorrow onwards — what the editor shows and
   * edits. A version closed in the past is history and never appears here.
   */
  export async function list(petId: string): Promise<FeedTime[]> {
    const { data, error } = await supabase.rpc('pet_feed_times', { target_pet_id: petId });

    if (error) throw error;

    return (data as FeedTimeRow[]).map(mapFeedTimeRow);
  }

  /**
   * Never an update in place. The RPC closes the current version and opens a
   * successor from tomorrow, so today keeps the times it was read with.
   */
  export async function saveFeedTime(
    petId: string,
    input: FeedTimeInput & { seriesId?: string }
  ): Promise<string> {
    const { data, error } = await supabase.rpc('save_feed_time', {
      target_pet_id: petId,
      target_label: input.label,
      target_local_time: input.localTime,
      target_days_of_week: input.daysOfWeek,
      target_instructions: input.instructions ?? null,
      target_series_id: input.seriesId ?? null
    });

    if (error?.code === DUPLICATE_LABEL) {
      throw new UserFacingError(`There is already a ${input.label} feed. Edit that one instead.`);
    }

    if (error) throw error;

    return data as string;
  }

  /** Closes the range. Past days keep the feed, so their history stays true. */
  export async function endFeedTime(petId: string, seriesId: string): Promise<void> {
    const { error } = await supabase.rpc('end_feed_time', {
      target_pet_id: petId,
      target_series_id: seriesId
    });

    if (error) throw error;
  }

  /** `date` is an ISO YYYY-MM-DD string in the household's timezone. */
  export async function getOccurrences(petId: string, date: string): Promise<Occurrence[]> {
    const { data, error } = await supabase.rpc('pet_occurrence_states', {
      target_pet_id: petId,
      target_date: date
    });

    if (error) throw error;

    return (data as OccurrenceRow[]).map((row) => ({
      seriesId: row.series_id,
      occurrenceDate: date,
      localTime: row.local_time,
      label: row.label,
      instructions: row.instructions,
      scheduledAt: row.scheduled_at,
      state: row.state,
      satisfyingLogId: row.satisfying_log_id,
      satisfiedAt: row.satisfied_at,
      satisfiedBy: row.satisfied_by
    }));
  }
}

function mapFeedTimeRow(row: FeedTimeRow): FeedTime {
  return {
    seriesId: row.series_id,
    localTime: row.local_time.slice(0, 5),
    label: row.label,
    daysOfWeek: row.days_of_week,
    instructions: row.instructions
  };
}

export default FeedTimeService;
