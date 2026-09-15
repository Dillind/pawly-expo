import { useLocalSearchParams } from 'expo-router';

import DeleteHousehold from '@/components/screens/household/delete-household';

export default function DeleteHouseholdScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();

  return <DeleteHousehold householdId={householdId} />;
}
