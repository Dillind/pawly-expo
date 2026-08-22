import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { PostPhoto } from '@/services/post.service';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent } from 'react-native';

const DOT_SIZE = 6;

type Props = {
  photos: PostPhoto[];
  onPress?: () => void;
  /** Post Detail only: opens that one photo instead of the Post. */
  onPressPhoto?: (photoId: string) => void;
};

/** One fixed square frame for every photo -- a frame that changed per page would lurch. */
const PostPhotoCarousel = ({ photos, onPress, onPressPhoto }: Props) => {
  const styles = useStyles(makeStyles);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  if (photos.length === 0) return null;

  const onScrollEnd = ({ contentOffset }: NativeScrollEvent) => {
    if (width > 0) setIndex(Math.round(contentOffset.x / width));
  };

  return (
    <View style={styles.frame} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          // Off while there is nothing to page to, so a single-photo card
          // does not rubber-band under the finger.
          scrollEnabled={photos.length > 1}
          onMomentumScrollEnd={(event) => onScrollEnd(event.nativeEvent)}>
          {photos.map((photo, at) => (
            // Plain Pressable, not PressableOpacity: a fade on press-in would
            // flash on the first frame of every swipe before the pan wins.
            <Pressable
              key={photo.id}
              disabled={!onPress && !onPressPhoto}
              onPress={onPressPhoto ? () => onPressPhoto(photo.id) : onPress}
              accessibilityRole={onPress || onPressPhoto ? 'button' : 'image'}
              style={{ width, height: '100%' }}
              accessibilityLabel={
                photos.length > 1 ? `Photo ${at + 1} of ${photos.length}` : undefined
              }>
              <Image
                source={{ uri: photo.url }}
                style={styles.photo}
                contentFit="cover"
                transition={150}
                accessibilityIgnoresInvertColors
              />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* The scrim is what keeps the dots visible on a pale photo. */}
      {photos.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {photos.map((photo, at) => (
            <View key={photo.id} style={[styles.dot, at === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    frame: {
      width: '100%',
      aspectRatio: 1,
      overflow: 'hidden',
      backgroundColor: colors.postDivider
    },
    photo: {
      flex: 1
    },
    dots: {
      position: 'absolute',
      bottom: spacing.three,
      alignSelf: 'center',
      flexDirection: 'row',
      gap: spacing.one,
      paddingVertical: spacing.two,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.full,
      backgroundColor: 'rgba(0, 0, 0, 0.35)'
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: Radius.full,
      backgroundColor: '#FFFFFF',
      opacity: 0.45
    },
    dotActive: {
      opacity: 1
    }
  });

export default PostPhotoCarousel;
