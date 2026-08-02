import { useHasHousehold } from '@/hooks/queries/use-has-household';
import { Stack } from 'expo-router';

export default function ProtectedLayout() {
  const { data: hasHousehold, isLoading } = useHasHousehold();

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!hasHousehold}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(hasHousehold)}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}
