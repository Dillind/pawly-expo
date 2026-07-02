import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function ForgotPasswordLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' }
        }}
      />
    </>
  );
}
