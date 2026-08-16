import HouseholdService from '@/services/household.service';
import { useAuthStore } from '@/stores/auth-store';
import { useQuery } from '@tanstack/react-query';

/** The key every mutation that changes membership has to invalidate. */
export const householdsKey = (userId: string | undefined) => ['households', userId];

/** Every household the signed-in user belongs to, oldest membership first. */
export function useHouseholds() {
  const { userId } = useAuthStore();

  return useQuery({
    queryKey: householdsKey(userId),
    queryFn: () => HouseholdService.listForUser(userId as string),
    enabled: Boolean(userId)
  });
}
