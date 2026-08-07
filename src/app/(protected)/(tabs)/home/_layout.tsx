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
          name="add-pet"
          options={{
            headerShown: true,
            headerTitle: 'Add a pet',
            headerBackButtonDisplayMode: 'minimal'
          }}
        />
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
