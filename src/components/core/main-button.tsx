import { GlassView } from 'expo-glass-effect';
import { useRouter, type Href } from 'expo-router';
import React, { type FunctionComponent } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { APP_ACTIVE_OPACITY } from '@/constants/primitives';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight } from '@/lib/haptics';
import { hasGlass } from '@/utils/platform';

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
  // ReactElement, not ReactNode: ReactNode admits a bare string, which type-checks
  // here and then crashes inside the wrapping View.
  leftIcon?: React.ReactElement;
  rightIcon?: React.ReactElement;
  hapticFeedback?: boolean;
  /** See IconButton — a glass control floating over a photo, not over the page. */
  isOverContent?: boolean;
};

// Fixed heights, not padding: two sizes in one row must still line up.
const SIZE_STYLES = {
  xs: { height: 28, paddingHorizontal: 12, borderRadius: 100, fontSize: 13 },
  sm: { height: 34, paddingHorizontal: 14, borderRadius: 100, fontSize: 14 },
  md: { height: 42, paddingHorizontal: 18, borderRadius: 100, fontSize: 17 },
  lg: { height: 50, paddingHorizontal: 22, borderRadius: 100, fontSize: 20 }
} as const;

// xs is 28pt, so it needs 8pt either side to clear 44pt.
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
  hapticFeedback = true,
  isOverContent = false
}) => {
  const styles = useStyles(makeStyles);
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const pressed = useSharedValue(0);

  // An animated style always wins, so a static disabled opacity never applied.
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

  // Below iOS 26 there is no material, so glass borrows `secondary`'s fill.
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
      <Text
        style={[
          styles.label,
          styles[`${labelVariant}Label`],
          isOverContent && styles.overContentLabel,
          { fontSize }
        ]}>
        {text}
      </Text>
      {!isLoading && rightIcon && <View style={styles.icon}>{rightIcon}</View>}
    </View>
  );

  // The material provides its own press response; layering one on top fights it.
  if (variant === 'glass' && hasGlass) {
    return (
      <GlassView
        isInteractive
        colorScheme={isOverContent || isDark ? 'dark' : 'light'}
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
    overContentLabel: {
      color: colors.onGlass
    },
    destructiveTextLabel: {
      color: colors.error
    }
  });

export default MainButton;
