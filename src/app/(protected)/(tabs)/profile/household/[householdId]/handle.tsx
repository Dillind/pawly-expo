import { useLocalSearchParams } from 'expo-router';

import HouseholdHandle from '@/components/screens/household/household-handle';

export default function HouseholdHandleScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();

  return <HouseholdHandle householdId={householdId} />;
}
