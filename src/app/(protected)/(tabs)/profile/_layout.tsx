import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/hooks/use-theme';

export default function ProfileLayout() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="notifications"
          options={{
            headerTitle: 'Notifications',
            headerBackTitle: 'Profile',
            headerBackButtonDisplayMode: 'minimal'
          }}
        />
      </Stack>
    </>
  );
}
