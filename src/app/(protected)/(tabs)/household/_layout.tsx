import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/hooks/use-theme';

export default function HouseholdLayout() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        {/* Full screen rather than a sheet. The composer stacks an image
            picker, a keyboard-driven caption and a date picker; a native modal
            over a native sheet is the rough edge the Sheets rule warns about,
            and none of the Household tab behind it is useful context. */}
        <Stack.Screen
          name="new-post"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="edit-post/[postId]"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </>
  );
}
