import { UserFacingError } from '@/lib/errors';
import type { SlotInput } from '@/lib/form/pet-schemas';
import { supabase } from '@/lib/supabase/client';
import type { FeedingScheduleLabel, SlotState, SlotStateValue } from '@/types/core';

export type FeedingSlot = {
  id: string;
  scheduledTime: string;
  label: FeedingScheduleLabel;
};

const DUPLICATE_LABEL = '23505';

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

namespace FeedingScheduleService {
  export async function list(petId: string): Promise<FeedingSlot[]> {
    const { data, error } = await supabase
      .from('feeding_schedules')
      .select('id, scheduled_time, label')
      .eq('pet_id', petId)
      .order('scheduled_time', { ascending: true });

    if (error) throw error;

    return data.map((row) => ({
      id: row.id,
      scheduledTime: row.scheduled_time.slice(0, 5),
      label: row.label
    }));
  }

  export async function upsertSlot(
    petId: string,
    input: SlotInput & { id?: string }
  ): Promise<void> {
    const row = { pet_id: petId, label: input.label, scheduled_time: input.scheduledTime };

    const { error } = input.id
      ? await supabase.from('feeding_schedules').update(row).eq('id', input.id)
      : await supabase.from('feeding_schedules').insert(row);

    // The partial unique index on (pet_id, label) surfaces here as a raw
    // Postgres error otherwise -- translate it into copy the form can show.
    if (error?.code === DUPLICATE_LABEL) {
      throw new UserFacingError(
        `There is already a ${input.label} feed. Edit that one instead.`
      );
    }

    if (error) throw error;
  }

  export async function deleteSlot(slotId: string): Promise<void> {
    const { error } = await supabase.from('feeding_schedules').delete().eq('id', slotId);
    if (error) throw error;
  }

  /** `date` is an ISO YYYY-MM-DD string in the household's timezone. */
  export async function getSlotStates(petId: string, date: string): Promise<SlotState[]> {
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
}

export default FeedingScheduleService;
