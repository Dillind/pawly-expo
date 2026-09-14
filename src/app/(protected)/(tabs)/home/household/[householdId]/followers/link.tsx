import { useLocalSearchParams } from 'expo-router';

import FollowLink from '@/components/screens/household/follow-link';

export default function HouseholdFollowLinkScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();

  return <FollowLink householdId={householdId} />;
}
