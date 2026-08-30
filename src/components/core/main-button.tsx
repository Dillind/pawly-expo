import { APP_ACTIVE_OPACITY } from '@/constants/primitives';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight } from '@/lib/haptics';
import { hasGlass } from '@/utils/platform';
import { GlassView } from 'expo-glass-effect';
import { type Href, useRouter } from 'expo-router';
import React, { type FunctionComponent } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_DURATION_MS = 100;
const DISABLED_OPACITY = 0.5;

type MainButtonProps = {
  text: string;
  containerStyle?: StyleProp<ViewStyle>;
  isLoading?: boolean;
  onPress?: () => void;
  href?: Href;
  isDisabled?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive' | 'destructiveText' | 'text' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xs';
  // ReactElement, not ReactNode: ReactNode admits a bare string, so passing an
  // IconName here type-checked and then crashed at render with "Text strings
  // must be rendered within a <Text> component" -- the icon is wrapped in a
  // View, and a raw string cannot live there.
  leftIcon?: React.ReactElement;
  rightIcon?: React.ReactElement;
  hapticFeedback?: boolean;
};

// Fixed heights, not vertical padding: a chip and a label of different sizes
// otherwise end up different heights in the same row.
const SIZE_STYLES = {
  xs: { height: 28, paddingHorizontal: 12, borderRadius: 100, fontSize: 13 },
  sm: { height: 34, paddingHorizontal: 14, borderRadius: 100, fontSize: 14 },
  md: { height: 42, paddingHorizontal: 18, borderRadius: 100, fontSize: 17 },
  lg: { height: 50, paddingHorizontal: 22, borderRadius: 100, fontSize: 20 }
} as const;

// xs is 28pt tall, so it needs 8pt either side to clear the 44pt tap target.
const XS_HIT_SLOP = { top: 8, bottom: 8, left: 0, right: 0 };

const MainButton: FunctionComponent<MainButtonProps> = ({
  text,
  containerStyle,
  onPress,
  href,
  isLoading,
  isDisabled,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  hapticFeedback = true
}) => {
  const styles = useStyles(makeStyles);
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const pressed = useSharedValue(0);

  // Opacity is owned here rather than by a `disabled` style in the array below:
  // an animated style always wins, so a later static opacity never applied.
  const restingOpacity = isDisabled || isLoading ? DISABLED_OPACITY : 1;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.get() * 0.04 }],
    opacity: restingOpacity - pressed.get() * (1 - APP_ACTIVE_OPACITY)
  }));

  if (!onPress && !href) return null;

  const handlePress = () => {
    if (isDisabled) return;
    if (hapticFeedback) hapticLight();
    onPress?.();
    if (href) router.push(href);
  };

  const handlePressIn = () => {
    pressed.set(withTiming(1, { duration: PRESS_DURATION_MS }));
  };

  const handlePressOut = () => {
    pressed.set(withTiming(0, { duration: PRESS_DURATION_MS }));
  };

  const { height, paddingHorizontal, borderRadius, fontSize } = SIZE_STYLES[size];

  // Below iOS 26 there is no material to render, so glass borrows `secondary`'s
  // fill. Its label is ink in both paths: gold on clear glass over a warm page
  // is 2.0:1, and white vanishes entirely.
  const fillVariant = variant === 'glass' ? 'secondary' : variant;
  const labelVariant = variant;

  const content = (
    <View style={styles.content}>
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'destructive' ? colors.onPrimary : undefined}
          style={styles.icon}
        />
      ) : (
        leftIcon && <View style={styles.icon}>{leftIcon}</View>
      )}
      <Text style={[styles.label, styles[`${labelVariant}Label`], { fontSize }]}>{text}</Text>
      {!isLoading && rightIcon && <View style={styles.icon}>{rightIcon}</View>}
    </View>
  );

  // The material provides its own press response, so this branch skips the
  // scale/opacity animation the other variants use -- layering one on top
  // fights the deformation.
  if (variant === 'glass' && hasGlass) {
    return (
      <GlassView
        isInteractive
        colorScheme={isDark ? 'dark' : 'light'}
        style={[
          styles.glassSurface,
          { borderRadius },
          { opacity: restingOpacity },
          containerStyle
        ]}>
        <Pressable
          onPress={handlePress}
          disabled={isDisabled || isLoading}
          style={[styles.base, { height, paddingHorizontal }]}>
          {content}
        </Pressable>
      </GlassView>
    );
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled || isLoading}
      hitSlop={size === 'xs' ? XS_HIT_SLOP : undefined}
      style={[
        styles.base,
        styles[fillVariant],
        { height, paddingHorizontal, borderRadius },
        containerStyle,
        animatedStyle
      ]}>
      {content}
    </AnimatedPressable>
  );
};

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    base: {
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center'
    },
    primary: {
      backgroundColor: colors.primary
    },
    // White with a hairline, not a grey fill. On a cream page a filled
    // secondary competes with the gold primary beside it.
    secondary: {
      backgroundColor: colors.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border
    },
    destructive: {
      backgroundColor: colors.error
    },
    text: {
      backgroundColor: 'transparent'
    },
    destructiveText: {
      backgroundColor: 'transparent'
    },
    glassSurface: {
      alignSelf: 'stretch',
      overflow: 'hidden',
      borderCurve: 'continuous'
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8
    },
    icon: {
      alignItems: 'center',
      justifyContent: 'center'
    },
    label: {
      fontWeight: 'bold'
    },
    primaryLabel: {
      color: colors.onPrimary
    },
    secondaryLabel: {
      color: colors.text
    },
    destructiveLabel: {
      color: colors.onPrimary
    },
    textLabel: {
      color: colors.primaryText
    },
    glassLabel: {
      color: colors.text
    },
    destructiveTextLabel: {
      color: colors.error
    }
  });

export default MainButton;
