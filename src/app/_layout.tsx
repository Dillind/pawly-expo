import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { AppState, useColorScheme, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';

import { useAuthSession } from '@/hooks/use-auth-session';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useAuthStore } from '@/stores/auth-store';
import { isWeb } from '@/utils/platform';

const queryClient = new QueryClient();

if (__DEV__) require('../../ReactotronConfig');

const AuthGate = () => {
  useAuthSession();
  useUserProfile();
  const { status } = useAuthStore();

  if (status === 'loading') return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="(public)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(protected)" />
      </Stack.Protected>
    </Stack>
  );
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // TanStack's documented React Native pattern. useFocusEffect does not fire
  // when the app returns from the background, which is the case that matters
  // most here: the phone is in a pocket, a housemate feeds the dog, the app
  // reopens and must not still show the slot as unfed.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (!isWeb) focusManager.setFocused(status === 'active');
    });

    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SafeAreaProvider>
          <KeyboardProvider>
            <QueryClientProvider client={queryClient}>
              <AuthGate />
            </QueryClientProvider>
          </KeyboardProvider>
          <Toaster richColors position="bottom-center" />
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
