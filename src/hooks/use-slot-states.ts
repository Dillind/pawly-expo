import { supabase } from '@/lib/supabase/client';
import type { FeedingScheduleLabel, SlotState, SlotStateValue } from '@/types/core';
import { useQuery } from '@tanstack/react-query';

const LIVE_REFETCH_MS = 60_000;

type SlotStateRow = {
  schedule_id: string;
  scheduled_time: string;
  label: FeedingScheduleLabel;
  scheduled_at: string;
  state: SlotStateValue;
  satisfying_log_id: string | null;
  satisfied_at: string | null;
  satisfied_by: string | null;
};

async function fetchSlotStates(petId: string, date: string): Promise<SlotState[]> {
  const { data, error } = await supabase.rpc('pet_slot_states', {
    target_pet_id: petId,
    target_date: date
  });

  if (error) throw error;

  return (data as SlotStateRow[]).map((row) => ({
    scheduleId: row.schedule_id,
    scheduledTime: row.scheduled_time,
    label: row.label,
    scheduledAt: row.scheduled_at,
    state: row.state,
    satisfyingLogId: row.satisfying_log_id,
    satisfiedAt: row.satisfied_at,
    satisfiedBy: row.satisfied_by
  }));
}

/**
 * `date` is an ISO YYYY-MM-DD string in the household's timezone — never a
 * Date, which re-serialises every render and thrashes the cache key.
 *
 * `live` is for today only. `state` is computed server-side at fetch time, so
 * a slot sitting at `due` would otherwise flip to `missed` with nothing
 * telling the client. A few rows once a minute while Home is focused is
 * cheaper than a client-side clock re-deriving a boundary ADR 0009 says it is
 * not allowed to know.
 */
export function useSlotStates(
  petId: string | undefined,
  date: string | undefined,
  options?: { live?: boolean }
) {
  return useQuery({
    queryKey: ['slot-states', petId, date],
    queryFn: () => fetchSlotStates(petId as string, date as string),
    enabled: Boolean(petId) && Boolean(date),
    refetchInterval: options?.live ? LIVE_REFETCH_MS : false
  });
}
