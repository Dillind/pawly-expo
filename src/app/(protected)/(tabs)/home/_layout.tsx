import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/hooks/use-theme';

export default function HomeLayout() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="pet/[petId]"
          options={{
            headerShown: true,
            headerTitle: 'Pet',
            headerBackTitle: 'Home',
            headerBackButtonDisplayMode: 'minimal'
          }}
        />
      </Stack>
    </>
  );
}
