import { Link, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import HeaderIconButton from '@/components/core/header-icon-button';
import { useHousehold } from '@/hooks/queries/use-household';
import { useTheme } from '@/hooks/use-theme';

export default function HomeLayout() {
  const { isDark } = useTheme();
  const { data: household } = useHousehold();
  const isOwner = household?.isOwner ?? false;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="pets"
          options={{
            headerShown: true,
            headerTitle: 'Pets',
            headerBackTitle: 'Home',
            headerBackButtonDisplayMode: 'minimal',
            headerRight: isOwner
              ? () => (
                  <Link href="/home/add-pet" asChild>
                    <HeaderIconButton name="plus" accessibilityLabel="Add a pet" />
                  </Link>
                )
              : undefined
          }}
        />
        <Stack.Screen
          name="activity"
          options={{
            headerShown: true,
            headerTitle: 'Activity',
            headerBackTitle: 'Home',
            headerBackButtonDisplayMode: 'minimal'
          }}
        />
        <Stack.Screen
          name="join-household"
          options={{
            headerShown: true,
            headerTitle: 'Join a household',
            headerBackButtonDisplayMode: 'minimal'
          }}
        />
        <Stack.Screen
          name="add-pet"
          options={{
            headerShown: true,
            headerTitle: 'Add a pet',
            headerBackButtonDisplayMode: 'minimal'
          }}
        />
        <Stack.Screen
          name="[petId]/index"
          options={{
            headerShown: true,
            headerTitle: 'Pet',
            headerBackTitle: 'Home',
            headerBackButtonDisplayMode: 'minimal'
          }}
        />
        {/* Full-screen, not a sheet: nine keyboard-heavy steps need the whole
            safe area, and nothing behind it is useful context. */}
        <Stack.Screen
          name="[petId]/care-card-editor"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_bottom'
          }}
        />
      </Stack>
    </>
  );
}
