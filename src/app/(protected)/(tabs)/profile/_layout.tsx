import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { GabaritoFontFamily, HeaderTitleStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// A push or link that opens a deep screen still gets Profile beneath it, so there is a way back.
export const unstable_settings = { initialRouteName: 'index' };

export default function ProfileLayout() {
  const { isDark } = useTheme();
  const router = useRouter();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="index">
          <Stack.Title style={HeaderTitleStyle}>Profile</Stack.Title>
          <Stack.Header transparent />
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              icon="gearshape"
              accessibilityLabel="Settings"
              onPress={() => router.push('/profile/settings')}
            />
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen name="settings/index">
          <Stack.Title style={HeaderTitleStyle}>Settings</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        <Stack.Screen name="settings/account">
          <Stack.Title style={HeaderTitleStyle}>Account</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        <Stack.Screen name="settings/feature-requests/index">
          <Stack.Title
            large
            style={HeaderTitleStyle}
            largeStyle={{ fontFamily: GabaritoFontFamily?.bold, fontSize: 32 }}>
            Feature requests
          </Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        <Stack.Screen name="settings/feature-requests/[requestId]/index">
          <Stack.Title>{''}</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        <Stack.Screen name="following">
          <Stack.Title style={HeaderTitleStyle}>Following</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
      </Stack>
    </>
  );
}
