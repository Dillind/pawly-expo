import { supabase } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

export type FeedingSlot = { id: string; scheduledTime: string; label: string };

async function fetchSchedules(petId: string): Promise<FeedingSlot[]> {
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

export function useFeedingSchedules(petId: string | undefined) {
  return useQuery({
    queryKey: ['feeding-schedules', petId],
    queryFn: () => fetchSchedules(petId as string),
    enabled: Boolean(petId)
  });
}
