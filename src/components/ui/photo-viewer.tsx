import IconButton from '@/components/core/icon-button';
import BaseModal from '@/components/modals/base-modal';
import { Radius, Spacing, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ViewerPhoto = { id: string; url: string };

type Props = {
  photo: ViewerPhoto;
  onClose: () => void;
};

const DISMISS_DISTANCE = 120;

const PhotoViewer = ({ photo, onClose }: Props) => {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const offsetY = useSharedValue(0);

  const dismiss = Gesture.Pan()
    .activeOffsetY(12)
    .onChange((event) => {
      offsetY.value = Math.max(event.translationY, 0);
    })
    .onEnd(() => {
      if (offsetY.value > DISMISS_DISTANCE) {
        runOnJS(onClose)();
        return;
      }

      offsetY.value = withTiming(0, { duration: 160 });
    });

  const stageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offsetY.value, [0, DISMISS_DISTANCE * 2], [1, 0.4], 'clamp')
  }));

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offsetY.value }]
  }));

  return (
    <BaseModal isVisible variant="bare" isBackdropDismissible={false} onClose={onClose}>
      <GestureDetector gesture={dismiss}>
        <Animated.View style={[styles.stage, stageStyle]}>
          <Animated.View style={[styles.frame, photoStyle]}>
            <Image
              source={photo.url}
              style={styles.photo}
              contentFit="contain"
              transition={150}
              accessibilityLabel="Photo"
              accessibilityIgnoresInvertColors
            />
          </Animated.View>

          <View style={[styles.bar, { top: insets.top + Spacing.two }]}>
            <IconButton
              name="close"
              accessibilityLabel="Close photo"
              variant="ghost"
              size={20}
              containerStyle={styles.close}
              onPress={onClose}
            />
          </View>
        </Animated.View>
      </GestureDetector>
    </BaseModal>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    stage: {
      flex: 1,
      backgroundColor: colors.background
    },
    frame: {
      flex: 1
    },
    photo: {
      flex: 1
    },
    bar: {
      position: 'absolute',
      right: spacing.three,
      alignSelf: 'flex-end'
    },
    close: {
      backgroundColor: colors.backgroundElement,
      borderRadius: Radius.full
    }
  });

export default PhotoViewer;
