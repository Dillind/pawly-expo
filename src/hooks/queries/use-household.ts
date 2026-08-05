import HouseholdService from '@/services/household.service';
import { useAuthStore } from '@/stores/auth-store';
import { useQuery } from '@tanstack/react-query';

/**
 * The household the signed-in user belongs to. Two of its fields are read
 * constantly by the feed-logging feature: `timezone` (every day boundary and
 * slot calculation resolves in it, never in device-local time) and
 * `graceWindowMinutes` (the double-feed check).
 */
export function useHousehold() {
  const { userId } = useAuthStore();

  return useQuery({
    queryKey: ['household', userId],
    queryFn: () => HouseholdService.getForUser(userId as string),
    enabled: Boolean(userId)
  });
}
