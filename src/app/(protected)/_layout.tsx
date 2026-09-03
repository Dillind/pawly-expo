import { Stack } from 'expo-router';

import { useAuthStore } from '@/stores/auth-store';

/**
 * No household gate. Signing in always lands in the tabs, and a user with no
 * household sees Home's empty state rather than being held in a wizard.
 *
 * The gate that used to live here forced `(onboarding)` on anyone without a
 * household, so the only way out was creating a pet. That is wrong for a real
 * and permanent kind of user -- a sitter or dog walker has no pets of their
 * own and never will, and the app had nothing to say to them.
 *
 * A name gate is the one exception, and ADR 0027 says why: everyone has a name,
 * so unlike a pet it is always answerable. `profile` is undefined until the row
 * loads, and the tabs win that tie -- flashing the name step at someone who
 * already has one is worse than a beat of delay.
 */
export default function ProtectedLayout() {
  const { profile } = useAuthStore();
  const needsName = profile !== undefined && !profile.firstName;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={needsName}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!needsName}>
        <Stack.Screen name="(tabs)" />
        {/* Where a scanned QR lands. Presented over the tabs rather than inside
            them: it is a question to answer, not a place to browse. */}
        <Stack.Screen
          name="invite/[code]/index"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack.Protected>
    </Stack>
  );
}
