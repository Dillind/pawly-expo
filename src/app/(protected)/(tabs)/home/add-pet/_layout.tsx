import { Stack } from 'expo-router';

/**
 * A nested stack inside the modal, so each step pushes rather than presenting.
 * A sheet raised from a modal is two modals, which Apple's modality guidance
 * and AGENTS.md both reject — so the pet-type and feed editors are screens here.
 */
export default function AddPetLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ headerTitle: 'Add a pet' }} />
      <Stack.Screen name="pet-type" options={{ headerTitle: 'Pet type', headerBackTitle: 'Details' }} />
      <Stack.Screen name="feeds" options={{ headerTitle: 'Add a pet', headerBackTitle: 'Details' }} />
      <Stack.Screen name="feed" options={{ headerTitle: 'Feed', headerBackTitle: 'Feeds' }} />
      <Stack.Screen name="instructions" options={{ headerTitle: 'Add a pet', headerBackTitle: 'Feeds' }} />
    </Stack>
  );
}
