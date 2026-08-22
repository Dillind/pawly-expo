import HouseholdService from '@/services/household.service';
import { useAuthStore } from '@/stores/auth-store';
import { useQuery } from '@tanstack/react-query';

const FIVE_MINUTES_MS = 5 * 60_000;

/** The key every mutation that changes membership has to invalidate. */
export const householdsKey = (userId: string | undefined) => ['households', userId];

/** Every household the signed-in user belongs to, oldest membership first. */
export function useHouseholds() {
  const { userId } = useAuthStore();

  return useQuery({
    queryKey: householdsKey(userId),
    queryFn: () => HouseholdService.listForUser(userId as string),
    enabled: Boolean(userId),
    // Households and their pets change when someone deliberately changes them,
    // and every one of those paths invalidates this key. Nothing is gained by
    // treating it as stale five minutes after it lands.
    staleTime: FIVE_MINUTES_MS
  });
}
