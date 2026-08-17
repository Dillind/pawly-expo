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
      <Stack.Screen name="forgot-password" options={{ title: 'Forgot password' }} />
    </Stack>
  );
}
