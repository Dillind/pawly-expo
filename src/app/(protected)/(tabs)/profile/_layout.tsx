import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/hooks/use-theme';

export default function ProfileLayout() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="settings/index" options={{ headerTitle: 'Settings' }} />
        <Stack.Screen name="settings/account" options={{ headerTitle: 'Account' }} />
        <Stack.Screen name="settings/notifications" options={{ headerTitle: 'Notifications' }} />
        <Stack.Screen name="settings/members" options={{ headerTitle: 'Members' }} />
      </Stack>
    </>
  );
}
