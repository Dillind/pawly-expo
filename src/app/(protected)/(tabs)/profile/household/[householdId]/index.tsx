import { useLocalSearchParams } from 'expo-router';

import HouseholdSettings from '@/components/screens/household/household-settings';

export default function HouseholdSettingsScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();

  return <HouseholdSettings householdId={householdId} />;
}
