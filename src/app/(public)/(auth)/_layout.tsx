import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Welcome' }} />
      {/* The welcome screen pushes these two, so they carry a header for its
          back button. Without one there is no way out of either. */}
      <Stack.Screen
        name="sign-in"
        options={{ title: 'Sign in', headerShown: true, headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="sign-up"
        options={{ title: 'Sign up', headerShown: true, headerBackTitle: 'Back' }}
      />
      <Stack.Screen name="forgot-password" options={{ title: 'Forgot password' }} />
    </Stack>
  );
}
