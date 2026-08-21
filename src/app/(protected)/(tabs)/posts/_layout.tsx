import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { HeaderTitleStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function HouseholdLayout() {
  const { isDark } = useTheme();
  const router = useRouter();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: true }}>
          <Stack.Title style={HeaderTitleStyle}>Posts</Stack.Title>
          <Stack.Header transparent />
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              icon="plus"
              accessibilityLabel="Share a photo"
              onPress={() => router.push('/posts/new-post')}
            />
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen name="[postId]/index" options={{ headerShown: true }}>
          <Stack.Title style={HeaderTitleStyle}>Post Detail</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        <Stack.Screen
          name="new-post"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="[postId]/edit"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </>
  );
}
