import { focusManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';

import AnimatedSplash from '@/components/screens/splash/animated-splash';
import { useUserProfile } from '@/hooks/queries/account/use-user-profile';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useCacheReset } from '@/hooks/use-cache-reset';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { persistOptions, queryClient } from '@/lib/query-client';
import { useActiveHouseholdStore } from '@/stores/active-household-store';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { isWeb } from '@/utils/platform';

if (__DEV__) require('../../ReactotronConfig');

// The native splash is a still image and cannot animate. It is held until the
// first JS frame, then AnimatedSplash carries the same gold field onward. Both
// use SplashPalette.field, so the handoff has no seam.
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

  // The splash is the window the boot work runs in: both stores rehydrate, the
  // Supabase session is restored, and a signed-in user's profile lands. Waiting
  // on the profile is what stops the first screen rendering without a name on
  // it. AnimatedSplash caps the wait, so a failed profile query cannot trap it.
  const isAppReady =
    hasHydrated &&
    hasHydratedHousehold &&
    status !== 'loading' &&
    (status === 'signedOut' || profile !== undefined);

  useEffect(() => {
    void hydrate();
    void hydrateActiveHousehold();
  }, [hydrate, hydrateActiveHousehold]);

  // Handing over on the first frame, not on isAppReady -- the overlay must be
  // painted before the native splash goes, or the gap shows as a white flash.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

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
