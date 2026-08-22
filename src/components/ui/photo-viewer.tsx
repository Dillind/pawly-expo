import AppText from '@/components/core/app-text';
import IconButton from '@/components/core/icon-button';
import BaseModal from '@/components/modals/base-modal';
import { Radius, Spacing, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ViewerPhoto = { id: string; url: string };

type Props = {
  photos: ViewerPhoto[];
  /** Which photo to open on. Out-of-range values are clamped. */
  initialIndex: number;
  onClose: () => void;
};

/**
 * Black in both themes on purpose: the photo is the only thing on screen, and a
 * themed surface behind it would tint how the photo reads.
 */
const PhotoViewer = ({ photos, initialIndex, onClose }: Props) => {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const startIndex = Math.min(Math.max(initialIndex, 0), Math.max(photos.length - 1, 0));
  const [index, setIndex] = useState(startIndex);

  if (photos.length === 0) return null;

  const onScrollEnd = ({ contentOffset }: NativeScrollEvent) => {
    setIndex(Math.min(Math.max(Math.round(contentOffset.x / width), 0), photos.length - 1));
  };

  return (
    <BaseModal isVisible variant="bare" isBackdropDismissible={false} onClose={onClose}>
      <View style={styles.stage}>
        {/* Paging over a plain ScrollView, not a list: ten photos at most, and a
            windowed list unmounts the page a swipe is landing on. */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={photos.length > 1}
          contentOffset={{ x: startIndex * width, y: 0 }}
          onMomentumScrollEnd={(event) => onScrollEnd(event.nativeEvent)}>
          {photos.map((photo, at) => (
            <View key={photo.id} style={{ width, height }}>
              <Image
                source={photo.url}
                style={styles.photo}
                contentFit="contain"
                transition={150}
                accessibilityLabel={`Photo ${at + 1} of ${photos.length}`}
                accessibilityIgnoresInvertColors
              />
            </View>
          ))}
        </ScrollView>

        <View style={[styles.bar, { top: insets.top + Spacing.two }]}>
          <IconButton
            name="close"
            accessibilityLabel="Close photo"
            variant="glass"
            size={20}
            onPress={onClose}
          />

          {photos.length > 1 && (
            <View style={styles.counter}>
              <AppText color="onPrimary" size={13} style={styles.counterText}>
                {`${index + 1} of ${photos.length}`}
              </AppText>
            </View>
          )}
        </View>
      </View>
    </BaseModal>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    stage: {
      flex: 1,
      backgroundColor: '#000000'
    },
    photo: {
      flex: 1
    },
    bar: {
      position: 'absolute',
      left: spacing.three,
      right: spacing.three,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    counter: {
      paddingVertical: spacing.one,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.full,
      backgroundColor: 'rgba(0, 0, 0, 0.45)'
    },
    counterText: {
      fontVariant: ['tabular-nums']
    }
  });

export default PhotoViewer;
