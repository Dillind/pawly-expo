import { focusManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AnimatedSplash from '@/components/screens/splash/animated-splash';
import { useUserProfile } from '@/hooks/queries/account/use-user-profile';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useCacheReset } from '@/hooks/use-cache-reset';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { persistOptions, queryClient } from '@/lib/query-client';
import { Toaster } from '@/lib/toast';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { isWeb } from '@/utils/platform';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- keeps Reactotron out of release bundles
if (__DEV__) require('../../ReactotronConfig');

void SplashScreen.preventAutoHideAsync();

const AuthGate = () => {
  useAuthSession();
  useCacheReset();
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
  const { hydrate, hasHydrated } = useThemeStore();
  const { hydrate: hydrateActiveHousehold, hasHydrated: hasHydratedHousehold } =
    useActiveHouseholdStore();
  const { status, profile } = useAuthStore();

  const [isSplashDone, setIsSplashDone] = useState(false);
  const handleSplashFinish = useCallback(() => setIsSplashDone(true), []);

  const isAppReady =
    hasHydrated &&
    hasHydratedHousehold &&
    status !== 'loading' &&
    (status === 'signedOut' || profile !== undefined);

  useEffect(() => {
    void hydrate();
    void hydrateActiveHousehold();
  }, [hydrate, hydrateActiveHousehold]);

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

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
            <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
              <AuthGate />
            </PersistQueryClientProvider>
          </KeyboardProvider>
          <Toaster richColors position="bottom-center" closeButton swipeToDismissDirection="left" />
          {!isSplashDone && (
            <AnimatedSplash isAppReady={isAppReady} onFinish={handleSplashFinish} />
          )}
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
