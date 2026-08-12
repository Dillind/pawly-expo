import HouseholdService from '@/services/household.service';
import { useAuthStore } from '@/stores/auth-store';
import { useQuery } from '@tanstack/react-query';

/** Every household the signed-in user belongs to, oldest membership first. */
export function useHouseholds() {
  const { userId } = useAuthStore();

  return useQuery({
    queryKey: ['households', userId],
    queryFn: () => HouseholdService.listForUser(userId as string),
    enabled: Boolean(userId)
  });
}
