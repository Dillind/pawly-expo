import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { PostPhoto } from '@/services/post.service';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, type NativeScrollEvent } from 'react-native';

const DOT_SIZE = 6;

type Props = { photos: PostPhoto[] };

/** One fixed square frame for every photo -- a pager whose frame changed per page would lurch. */
const PostPhotoCarousel = ({ photos }: Props) => {
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
              <Image
                key={photo.id}
                source={{ uri: photo.url }}
                style={{ width, height: '100%' }}
                contentFit="cover"
                transition={150}
                accessibilityIgnoresInvertColors
                accessibilityLabel={
                  photos.length > 1 ? `Photo ${at + 1} of ${photos.length}` : undefined
                }
              />
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
