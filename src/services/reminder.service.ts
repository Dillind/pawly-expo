import { supabase } from '@/lib/supabase/client';
import type {
  ReminderKind,
  ReminderLeadDays,
  ReminderOccurrence,
  ReminderRepeat,
  ReminderStateValue
} from '@/types/core';

export type ReminderInput = {
  petId: string;
  title: string;
  kind: ReminderKind;
  /** ISO YYYY-MM-DD in the household's timezone. */
  startsOn: string;
  /** HH:mm. */
  localTime: string;
  repeat: ReminderRepeat;
  leadDays: ReminderLeadDays;
};

type ReminderRow = {
  reminder_id: string;
  title: string;
  kind: ReminderKind;
  local_time: string;
  state: ReminderStateValue;
  done_by: string | null;
  done_at: string | null;
};

type ReminderDayRow = { day: string; kinds: ReminderKind[] };

namespace ReminderService {
  /** `date` is an ISO YYYY-MM-DD string in the household's timezone. */
  export async function listForDay(petId: string, date: string): Promise<ReminderOccurrence[]> {
    const { data, error } = await supabase.rpc('pet_reminders', {
      target_pet_id: petId,
      target_date: date
    });

    if (error) throw error;

    return (data as ReminderRow[]).map((row) => ({
      reminderId: row.reminder_id,
      occurrenceDate: date,
      title: row.title,
      kind: row.kind,
      localTime: row.local_time.slice(0, 5),
      state: row.state,
      doneBy: row.done_by,
      doneAt: row.done_at
    }));
  }

  /**
   * The dots under each day of the week strip, keyed by date. One round trip
   * for the strip: a query per day is seven, and the strip pages.
   */
  export async function daysWithReminders(
    householdId: string,
    fromDate: string,
    toDate: string
  ): Promise<Record<string, ReminderKind[]>> {
    const { data, error } = await supabase.rpc('household_reminder_days', {
      target_household_id: householdId,
      from_date: fromDate,
      to_date: toDate
    });

    if (error) throw error;

    return Object.fromEntries((data as ReminderDayRow[]).map((row) => [row.day, row.kinds]));
  }

  export async function create(input: ReminderInput): Promise<string> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;

    if (!userId) throw new Error('Not signed in');

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        pet_id: input.petId,
        title: input.title.trim(),
        kind: input.kind,
        starts_on: input.startsOn,
        local_time: input.localTime,
        repeat: input.repeat,
        lead_days: input.leadDays,
        created_by: userId
      })
      .select('id')
      .single();

    if (error) throw error;

    return (data as { id: string }).id;
  }

  /**
   * Soft, so the completions survive. A hard delete would cascade them away and
   * rewrite what the household did.
   */
  export async function remove(reminderId: string): Promise<void> {
    const { error } = await supabase
      .from('reminders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', reminderId);

    if (error) throw error;
  }

  export async function complete(reminderId: string, occurrenceDate: string): Promise<void> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;

    if (!userId) throw new Error('Not signed in');

    const { error } = await supabase.from('reminder_completions').insert({
      reminder_id: reminderId,
      occurrence_date: occurrenceDate,
      done_by: userId
    });

    if (error) throw error;
  }

  /** Unticking is a delete: a completion is either there or it is not. */
  export async function removeCompletion(reminderId: string, occurrenceDate: string): Promise<void> {
    const { error } = await supabase
      .from('reminder_completions')
      .delete()
      .eq('reminder_id', reminderId)
      .eq('occurrence_date', occurrenceDate);

    if (error) throw error;
  }
}

export default ReminderService;
