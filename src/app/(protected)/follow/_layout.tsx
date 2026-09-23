import { Stack, useRouter } from 'expo-router';

import { HeaderTitleStyle } from '@/constants/theme';

// Outside the tabs: a follow link is a question to answer, not a place to
// browse.
export default function FollowLayout() {
  const router = useRouter();

  // Either screen can be first in this stack, and iOS draws no back button with
  // nothing to pop to, so each carries its own close.
  const close = () => (router.canGoBack() ? router.back() : router.replace('/posts'));

  return (
    <Stack screenOptions={{ headerTransparent: true, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="[householdId]/index">
        <Stack.Title style={HeaderTitleStyle}>Household</Stack.Title>
        <Stack.Screen.BackButton hidden />
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button icon="xmark" accessibilityLabel="Close" onPress={close} />
        </Stack.Toolbar>
      </Stack.Screen>
      <Stack.Screen name="[householdId]/pet/[petId]/index">
        <Stack.Title style={HeaderTitleStyle}>Pet</Stack.Title>
        <Stack.Screen.BackButton hidden />
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button icon="xmark" accessibilityLabel="Close" onPress={close} />
        </Stack.Toolbar>
      </Stack.Screen>
    </Stack>
  );
}
