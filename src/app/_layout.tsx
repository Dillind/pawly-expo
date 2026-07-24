import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';

import { useAuthSession } from '@/hooks/use-auth-session';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useAuthStore } from '@/stores/auth-store';

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SafeAreaProvider>
          <KeyboardProvider>
            <QueryClientProvider client={queryClient}>
              <AuthGate />
            </QueryClientProvider>
          </KeyboardProvider>
          <Toaster richColors position="top-center" />
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
