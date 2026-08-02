import HouseholdService from '@/services/household.service';
import { useAuthStore } from '@/stores/auth-store';
import { useQuery } from '@tanstack/react-query';

/**
 * Gates the (protected) area between (onboarding) and (tabs). Deliberately
 * separate from useAuthStore -- "has a household" is server data, not session
 * identity.
 */
export function useHasHousehold() {
  const { userId } = useAuthStore();

  return useQuery({
    queryKey: ['has-household', userId],
    queryFn: () => HouseholdService.existsForUser(userId as string),
    enabled: Boolean(userId)
  });
}
