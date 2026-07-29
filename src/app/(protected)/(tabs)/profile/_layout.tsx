import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function ProfileLayout() {
  return (
    <>
      <StatusBar style="dark" />
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
