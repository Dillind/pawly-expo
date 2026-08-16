import FeedingScheduleService from '@/services/feeding-schedule.service';
import { useQuery } from '@tanstack/react-query';

export function useFeedingSchedules(petId: string | undefined) {
  return useQuery({
    queryKey: ['feeding-schedules', petId],
    queryFn: () => FeedingScheduleService.list(petId as string),
    enabled: Boolean(petId)
  });
}
