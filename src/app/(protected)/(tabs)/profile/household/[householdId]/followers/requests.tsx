import { useLocalSearchParams } from 'expo-router';

import FollowRequests from '@/components/screens/household/follow-requests';

export default function HouseholdFollowRequestsScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();

  return <FollowRequests householdId={householdId} />;
}
