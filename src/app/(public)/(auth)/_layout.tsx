import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: 'Welcome' }} />
      {/* Headers give the two pushed screens a back button; without one they trap
          you. The title is blank because each screen draws its own heading. */}
      <Stack.Screen name="sign-in" options={{ title: '', headerShown: true }}>
        <Stack.Header transparent />
        <Stack.Screen.BackButton displayMode="minimal" />
      </Stack.Screen>
      <Stack.Screen name="sign-up" options={{ title: '', headerShown: true }}>
        <Stack.Header transparent />
        <Stack.Screen.BackButton displayMode="minimal" />
      </Stack.Screen>
      {/* The reset flow is grouped in a folder for readability, but deliberately
          has no _layout of its own -- a nested navigator would give its first
          screen nothing to go back to, and the back button would vanish. */}
      <Stack.Screen name="forgot-password/index" options={{ title: '', headerShown: true }}>
        <Stack.Header transparent />
        <Stack.Screen.BackButton displayMode="minimal" />
      </Stack.Screen>
      <Stack.Screen name="forgot-password/verify" options={{ title: '', headerShown: true }}>
        <Stack.Header transparent />
        <Stack.Screen.BackButton displayMode="minimal" />
      </Stack.Screen>
      {/* No back button: the code is spent by the time this screen renders, so
          returning to the verify screen only offers a code that cannot work. */}
      <Stack.Screen
        name="forgot-password/new-password"
        options={{ title: '', headerShown: true, gestureEnabled: false }}>
        <Stack.Header transparent />
        <Stack.Screen.BackButton hidden />
      </Stack.Screen>
    </Stack>
  );
}
