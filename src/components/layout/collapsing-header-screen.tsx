import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenView from '@/components/layout/screen-view';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

const BAR_HEIGHT = 58;
const FADE_DURATION_MS = 240;
const SLIDE_DURATION_MS = 320;
const SLIDE_DISTANCE = 10;

type Props = {
  bar: ReactNode;
  children: ReactNode;
  // Where the screen's own identity block leaves the top of the scroll view.
  threshold?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

// The bar condenses what scrolled away. The handler runs on the UI thread,
// because a bar driven from JavaScript arrives a frame or two after the finger.
const CollapsingHeaderScreen = ({
  bar,
  children,
  threshold = 86,
  contentContainerStyle
}: Props) => {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  const barStyle = useAnimatedStyle(() => {
    const isShown = scrollY.get() > threshold;

    return {
      opacity: withTiming(isShown ? 1 : 0, { duration: FADE_DURATION_MS }),
      transform: [
        { translateY: withTiming(isShown ? 0 : -SLIDE_DISTANCE, { duration: SLIDE_DURATION_MS }) }
      ],
      pointerEvents: isShown ? 'auto' : 'none'
    };
  });

  return (
    <ScreenView edges={[]}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, { paddingTop: insets.top }, contentContainerStyle]}>
        {children}
      </Animated.ScrollView>

      <Animated.View
        style={[styles.bar, { paddingTop: insets.top, height: BAR_HEIGHT + insets.top }, barStyle]}>
        {bar}
      </Animated.View>
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: ScreenGutter
    },
    bar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two + 2,
      paddingHorizontal: spacing.three + spacing.one,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border
    }
  });

export default CollapsingHeaderScreen;
