import { Stack } from 'expo-router';

/**
 * No household gate. Signing in always lands in the tabs, and a user with no
 * household sees Home's empty state rather than being held in a wizard.
 *
 * The gate that used to live here forced `(onboarding)` on anyone without a
 * household, so the only way out was creating a pet. That is wrong for a real
 * and permanent kind of user -- a sitter or dog walker has no pets of their
 * own and never will, and the app had nothing to say to them.
 */
export default function ProtectedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      {/* Where a scanned QR lands. Presented over the tabs rather than inside
          them: it is a question to answer, not a place to browse. */}
      <Stack.Screen
        name="invite/[code]"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}
