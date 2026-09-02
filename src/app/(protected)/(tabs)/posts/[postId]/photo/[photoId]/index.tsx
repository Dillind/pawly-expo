import ZoomablePhoto from '@/components/ui/zoomable-photo';
import { usePost } from '@/hooks/queries/posts/use-posts';
import { useAuthStore } from '@/stores/auth-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

/**
 * A Post's photos, full screen. Always black, whatever the theme -- a photo
 * viewer is a dark room, and a pale ground changes how the photo itself reads.
 */
export default function PostPhotoScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const { postId, photoId } = useLocalSearchParams<{ postId: string; photoId: string }>();
  const { userId } = useAuthStore();
  const { data: post, isLoading } = usePost(postId, userId ?? undefined);

  const [isZoomed, setIsZoomed] = useState(false);
  const dismissProgress = useSharedValue(0);

  const photos = post?.photos ?? [];
  const openAt = Math.max(
    0,
    photos.findIndex((candidate) => candidate.id === photoId)
  );

  // The ground fades with the drag, so a downward flick reads as putting the
  // photo back rather than as the screen falling over.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 1 - dismissProgress.get() * 0.6
  }));

  const close = () => {
    if (router.canGoBack()) return router.back();

    router.replace({ pathname: '/posts/[postId]', params: { postId: postId! } });
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (photos.length === 0) return <View style={styles.loading} />;

  return (
    <Animated.View style={[styles.root, backdropStyle]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // Off while a photo is zoomed, or a pan across it would page instead.
        scrollEnabled={!isZoomed && photos.length > 1}
        contentOffset={{ x: openAt * width, y: 0 }}>
        {photos.map((photo, at) => (
          <ZoomablePhoto
            key={photo.id}
            url={photo.url}
            accessibilityLabel={photos.length > 1 ? `Photo ${at + 1} of ${photos.length}` : 'Photo'}
            dismissProgress={dismissProgress}
            onZoomChange={setIsZoomed}
            onDismiss={close}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000'
  },
  loading: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
