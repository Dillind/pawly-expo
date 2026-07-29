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
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
