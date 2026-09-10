import { useLocalSearchParams } from 'expo-router';

import FollowHousehold from '@/components/screens/follow/follow-household';

export default function FollowHouseholdScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();

  return <FollowHousehold householdId={householdId} />;
}
