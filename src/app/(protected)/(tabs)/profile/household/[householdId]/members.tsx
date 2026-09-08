import { useLocalSearchParams } from 'expo-router';

import MembersList from '@/components/screens/profile/members-list';

export default function HouseholdMembersScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();

  return <MembersList householdId={householdId} />;
}
