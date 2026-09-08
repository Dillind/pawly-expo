import { useLocalSearchParams } from 'expo-router';

import InviteMember from '@/components/screens/household/invite-member';

export default function HouseholdInviteScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();

  return <InviteMember householdId={householdId} />;
}
