import { useLocalSearchParams } from 'expo-router';

import FollowersList from '@/components/screens/household/followers-list';

export default function HouseholdFollowersScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();

  return <FollowersList householdId={householdId} />;
}
