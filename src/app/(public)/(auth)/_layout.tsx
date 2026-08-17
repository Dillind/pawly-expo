import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: 'Welcome' }} />
      {/* Headers give the two pushed screens a back button; without one they trap
          you. The title is blank because each screen draws its own heading. */}
      <Stack.Screen
        name="sign-in"
        options={{ title: '', headerShown: true, headerBackTitle: 'Welcome' }}
      />
      <Stack.Screen
        name="sign-up"
        options={{ title: '', headerShown: true, headerBackTitle: 'Welcome' }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{ title: '', headerShown: true, headerBackTitle: 'Sign in' }}
      />
      <Stack.Screen
        name="verify-reset"
        options={{ title: '', headerShown: true, headerBackTitle: 'Back' }}
      />
      {/* No back button: the code is spent by the time this screen renders, so
          returning to the verify screen only offers a code that cannot work. */}
      <Stack.Screen
        name="reset-password"
        options={{ title: '', headerShown: true, headerBackVisible: false, gestureEnabled: false }}
      />
    </Stack>
  );
}
