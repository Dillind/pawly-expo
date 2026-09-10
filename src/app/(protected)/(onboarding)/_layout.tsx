import { Stack } from 'expo-router';

import { useAuthStore } from '@/stores/auth-store';

/**
 * One step. The guard is what holds a member with no first name; an Apple or
 * Google member arrives with one and never sees this group.
 */
export default function OnboardingLayout() {
  const { profile } = useAuthStore();
  const needsName = profile !== undefined && !profile.firstName;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={needsName}>
        <Stack.Screen name="name" />
      </Stack.Protected>
    </Stack>
  );
}
