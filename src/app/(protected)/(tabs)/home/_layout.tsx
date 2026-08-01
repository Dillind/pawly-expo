import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/hooks/use-theme';

export default function HomeLayout() {
  const { isDark } = useTheme();

  return (
    <>
      {/* Not style="auto": it reads the OS scheme, which is the wrong one once
          the appearance preference is pinned to light or dark. */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        {/* The pet screen is pushed, so it needs the stack header to get back.
            The title is set by the screen itself, which is where the name is. */}
        <Stack.Screen
          name="pet/[petId]"
          options={{
            headerShown: true,
            // A placeholder, not the real title: the screen swaps in the pet's
            // name once it loads. Without it the route name shows while loading.
            headerTitle: 'Pet',
            headerBackTitle: 'Home',
            headerBackButtonDisplayMode: 'minimal'
          }}
        />
      </Stack>
    </>
  );
}
