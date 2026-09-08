import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { HeaderTitleStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
        <Stack.Screen name="settings/username">
          <Stack.Title style={HeaderTitleStyle}>Username</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        {/* Static, not the household's name: the screen shows the name in its
            own identity block, and a data-driven title needs Stack.Title from
            inside the screen, outside every early return. */}
        <Stack.Screen name="household/[householdId]/index">
          <Stack.Title style={HeaderTitleStyle}>Household</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        <Stack.Screen name="household/[householdId]/notifications">
          <Stack.Title style={HeaderTitleStyle}>Notifications</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        <Stack.Screen name="household/[householdId]/members">
          <Stack.Title style={HeaderTitleStyle}>Members</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        <Stack.Screen name="household/[householdId]/invite">
          <Stack.Title style={HeaderTitleStyle}>Invite someone</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
      </Stack>
    </>
  );
}
