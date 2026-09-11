import { Stack, useRouter } from 'expo-router';

import { HeaderTitleStyle } from '@/constants/theme';

/**
 * The follower's side of the app, outside the tabs. A follow link is a
 * question to answer rather than a place to browse, and none of this is care
 * work -- Home stays member-only.
 */
export default function FollowLayout() {
  const router = useRouter();

  // Both screens are reachable as the first of this stack -- the household
  // through a follow link, the Pet through a Pet Tag on a followed post. iOS
  // draws no back button with nothing to pop to, so each carries its own close
  // and each falls back to the tab the viewer came from.
  const close = () => (router.canGoBack() ? router.back() : router.replace('/posts'));

  return (
    <Stack>
      {/* Always pushed, never the first of this stack, so it keeps a real back
          button where the other two carry their own close. */}
      <Stack.Screen name="search">
        <Stack.Title style={HeaderTitleStyle}>Find a household</Stack.Title>
        <Stack.Header transparent />
        <Stack.Screen.BackButton displayMode="minimal" />
      </Stack.Screen>
      <Stack.Screen name="[householdId]/index">
        <Stack.Title style={HeaderTitleStyle}>Household</Stack.Title>
        <Stack.Header transparent />
        <Stack.Screen.BackButton hidden />
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button icon="xmark" accessibilityLabel="Close" onPress={close} />
        </Stack.Toolbar>
      </Stack.Screen>
      <Stack.Screen name="[householdId]/pet/[petId]/index">
        <Stack.Title style={HeaderTitleStyle}>Pet</Stack.Title>
        <Stack.Header transparent />
        <Stack.Screen.BackButton hidden />
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button icon="xmark" accessibilityLabel="Close" onPress={close} />
        </Stack.Toolbar>
      </Stack.Screen>
    </Stack>
  );
}
