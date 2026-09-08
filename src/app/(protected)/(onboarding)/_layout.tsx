import { Stack } from 'expo-router';

import { useAuthStore } from '@/stores/auth-store';

/**
 * Two steps, each shown only while it is unanswered. An Apple or Google member
 * arrives with a name already, so they land straight on the username step --
 * and the name step unmounting is what carries an email member forward.
 */
export default function OnboardingLayout() {
  const { profile } = useAuthStore();
  const needsName = profile !== undefined && !profile.firstName;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={needsName}>
        <Stack.Screen name="name" />
      </Stack.Protected>
      <Stack.Protected guard={!needsName}>
        <Stack.Screen name="username" />
      </Stack.Protected>
    </Stack>
  );
}
