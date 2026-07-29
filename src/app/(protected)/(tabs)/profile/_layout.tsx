import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function ProfileLayout() {
  return (
    <>
      <StatusBar style="dark" />
      {/*
        The app's header pattern, established here by its first pushed route:
        a tab root keeps its own large AppText header and no native header;
        a pushed screen gets the native header and the back arrow that comes
        with it. Putting a native header on the root would give Profile two
        titles, since index.tsx already renders its own.
      */}
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerTitle: 'Notifications' }} />
      </Stack>
    </>
  );
}
