import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { HeaderTitleStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import usePostsScopeStore from '@/stores/posts-scope-store';

export default function PostsLayout() {
  const { isDark } = useTheme();
  const router = useRouter();
  const { requestFilter } = usePostsScopeStore();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: true }}>
          <Stack.Title style={HeaderTitleStyle}>Posts</Stack.Title>
          <Stack.Header transparent />
          {/* Two bar buttons and a sheet, never a segmented control: iOS draws
              its own glass behind a bar item, and the second half of the filter
              is a household picker no three-cell control can hold. */}
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              icon="line.3.horizontal.decrease"
              accessibilityLabel="Filter posts"
              onPress={requestFilter}
            />
            <Stack.Toolbar.Button
              icon="plus"
              accessibilityLabel="Share a photo"
              onPress={() => router.push('/posts/new-post')}
            />
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen name="[postId]/index" options={{ headerShown: true }}>
          <Stack.Title style={HeaderTitleStyle}>Post</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        <Stack.Screen name="[postId]/comments" options={{ headerShown: true }}>
          <Stack.Title style={HeaderTitleStyle}>Comments</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        {/* A native screen, not a modal: iOS draws the glass circle behind a
            bar button item, and the push is a render-server transition. */}
        <Stack.Screen
          name="[postId]/photo/[photoId]/index"
          options={{
            headerShown: true,
            presentation: 'fullScreenModal',
            animation: 'fade_from_bottom',
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
          name="new-post"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="[postId]/edit"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </>
  );
}
