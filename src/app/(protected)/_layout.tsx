import { Stack } from 'expo-router';

import { useAuthStore } from '@/stores/auth-store';

// No household gate: a sitter has no pets of their own and never will. The name
// gate is the exception, because everyone has a name. See ADR 0027. The tabs win
// while `profile` is undefined: flashing the name step is worse than a delay.
export default function ProtectedLayout() {
  const { profile } = useAuthStore();
  const needsOnboarding = profile !== undefined && !profile.firstName;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={needsOnboarding}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!needsOnboarding}>
        <Stack.Screen name="(tabs)" />
        {/* Where a scanned QR lands. Over the tabs rather than inside
            them: it is a question to answer, not a place to browse. */}
        <Stack.Screen
          name="invite/[code]/index"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        {/* The follower's side, the same way and for the same
            reason. It is outside the tabs because none of it is care work. */}
        <Stack.Screen
          name="follow"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack.Protected>
    </Stack>
  );
}
