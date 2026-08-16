import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { PostPhoto } from '@/services/post.service';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent } from 'react-native';

const DOT_SIZE = 6;

type Props = { photos: PostPhoto[]; onPress?: () => void };

/** One fixed square frame for every photo -- a pager whose frame changed per page would lurch. */
const PostPhotoCarousel = ({ photos, onPress }: Props) => {
  const styles = useStyles(makeStyles);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  if (photos.length === 0) return null;

  const onScrollEnd = ({ contentOffset }: NativeScrollEvent) => {
    if (width > 0) setIndex(Math.round(contentOffset.x / width));
  };

  return (
    <View style={styles.container}>
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
                disabled={!onPress}
                onPress={onPress}
                accessibilityRole={onPress ? 'button' : 'image'}
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
      </View>

      {photos.length > 1 && (
        <View style={styles.dots}>
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
    container: {
      gap: spacing.two
    },
    frame: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      overflow: 'hidden',
      backgroundColor: colors.backgroundElement
    },
    photo: {
      flex: 1
    },
    dots: {
      flexDirection: 'row',
      alignSelf: 'center',
      gap: spacing.one
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: Radius.full,
      backgroundColor: colors.textSecondary,
      opacity: 0.3
    },
    dotActive: {
      backgroundColor: colors.primary,
      opacity: 1
    }
  });

export default PostPhotoCarousel;
