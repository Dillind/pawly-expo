import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import HouseholdSwitcher from '@/components/ui/household-switcher';
import { HeaderTitleStyle } from '@/constants/theme';
import { useUnreadAlertCount } from '@/hooks/queries/alerts/use-alerts';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useTheme } from '@/hooks/use-theme';

const BADGE_CAP = 99;

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
          {/* The switcher is a title, not a left `Stack.Toolbar.View`. A custom
              left bar item hands its geometry to the next screen's back button,
              which then draws its background as a wide rectangle for the whole
              push. A title is outside the left bar-item group, so it cannot. */}
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
                <Stack.Toolbar.Badge>
                  {unread > BADGE_CAP ? `${BADGE_CAP}+` : String(unread)}
                </Stack.Toolbar.Badge>
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

        {/* No bar at all: the photo runs to the top of the screen, and the
            back button is a glass circle drawn on it. A transparent bar would
            still reserve its height and push the photo down. */}
        <Stack.Screen name="[petId]/index" options={{ headerShown: false }} />

        {/* A native screen, not a modal: iOS draws the glass circle behind a
            bar button item, and the push is a render-server transition. A
            `react-native-modal` fade is orchestrated in JS and never matches. */}
        <Stack.Screen
          name="[petId]/photo/[photoId]/index"
          options={{
            headerShown: true,
            presentation: 'fullScreenModal',
            animation: 'fade',
            title: ''
          }}>
          <Stack.Header transparent />
          <Stack.Screen.BackButton hidden />
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              icon="xmark"
              accessibilityLabel="Close photo"
              onPress={() => router.back()}
            />
          </Stack.Toolbar>
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

// UIKit centres the title slot, so a box that hugs its content lands in the
// middle. A width wider than the slot is what pins the switcher to the left.
const styles = StyleSheet.create({
  switcher: {
    width: 300,
    height: 34,
    justifyContent: 'center',
    alignItems: 'flex-start'
  }
});
