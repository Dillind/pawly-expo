import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';

import { useUserProfile } from '@/hooks/queries/account/use-user-profile';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { isWeb } from '@/utils/platform';

const queryClient = new QueryClient();

if (__DEV__) require('../../ReactotronConfig');

const AuthGate = () => {
  useAuthSession();
  useUserProfile();
  usePushNotifications();
  const { status, isRecovering } = useAuthStore();
  const { hasHydrated } = useThemeStore();

  if (status === 'loading' || !hasHydrated) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedOut' || isRecovering}>
        <Stack.Screen name="(public)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedIn' && !isRecovering}>
        <Stack.Screen name="(protected)" />
      </Stack.Protected>
    </Stack>
  );
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { hydrate } = useThemeStore();
  const { hydrate: hydrateActiveHousehold } = useActiveHouseholdStore();

  useEffect(() => {
    void hydrate();
    void hydrateActiveHousehold();
  }, [hydrate, hydrateActiveHousehold]);

  // TanStack's documented React Native pattern. useFocusEffect does not fire
  // when the app returns from the background, which is the case that matters
  // most here: the phone is in a pocket, a housemate feeds the dog, the app
  // reopens and must not still show the occurrence as unfed.
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
          <Toaster richColors position="bottom-center" closeButton swipeToDismissDirection="left" />
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
