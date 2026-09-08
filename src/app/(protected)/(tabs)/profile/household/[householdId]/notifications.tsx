import { useLocalSearchParams } from 'expo-router';

import NotificationSettings from '@/components/screens/profile/notification-settings';

export default function HouseholdNotificationsScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();

  return <NotificationSettings householdId={householdId} />;
}
