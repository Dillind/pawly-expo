import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import HouseholdSwitcher from '@/components/ui/household-switcher';
import { HeaderTitleStyle } from '@/constants/theme';
import { useUnreadAlertCount } from '@/hooks/queries/alerts/use-alerts';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useTheme } from '@/hooks/use-theme';

export default function HomeLayout() {
  const { isDark } = useTheme();
  const router = useRouter();
  const { data: household } = useHousehold();
  const isOwner = household?.isOwner ?? false;
  const { data: unread = 0 } = useUnreadAlertCount(household?.id);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: true }}>
          <Stack.Title asChild>
            <View style={styles.switcher}>
              <HouseholdSwitcher />
            </View>
          </Stack.Title>
          <Stack.Header transparent />
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              onPress={() => router.push('/home/notifications')}>
              <Stack.Toolbar.Icon sf="bell" />
              {unread > 0 && (
                <Stack.Toolbar.Badge>{unread > 99 ? '99+' : String(unread)}</Stack.Toolbar.Badge>
              )}
            </Stack.Toolbar.Button>
          </Stack.Toolbar>
        </Stack.Screen>

        <Stack.Screen name="pets" options={{ headerShown: true }}>
          <Stack.Title style={HeaderTitleStyle}>Pets</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              icon="plus"
              accessibilityLabel="Add a pet"
              hidden={!isOwner}
              onPress={() => router.push('/home/add-pet')}
            />
          </Stack.Toolbar>
        </Stack.Screen>

        <Stack.Screen name="activity" options={{ headerShown: true }}>
          <Stack.Title style={HeaderTitleStyle}>Activity</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>

        <Stack.Screen name="notifications" options={{ headerShown: true }}>
          <Stack.Title style={HeaderTitleStyle}>Notifications</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>

        <Stack.Screen name="join-household" options={{ headerShown: true }}>
          <Stack.Title style={HeaderTitleStyle}>Join a household</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>

        <Stack.Screen
          name="add-pet"
          options={{
            presentation: 'modal'
          }}
        />

        <Stack.Screen name="[petId]/index" options={{ headerShown: true }}>
          <Stack.Title style={HeaderTitleStyle}>Pet Detail</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>

        <Stack.Screen
          name="[petId]/care-card-editor"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom'
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  switcher: {
    width: 300,
    height: 34,
    justifyContent: 'center',
    alignItems: 'flex-start'
  }
});
