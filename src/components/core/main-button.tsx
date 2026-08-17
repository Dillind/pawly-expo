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
  variant?: 'primary' | 'secondary' | 'destructive' | 'text' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xs';
  // ReactElement, not ReactNode: ReactNode admits a bare string, so passing an
  // IconName here type-checked and then crashed at render with "Text strings
  // must be rendered within a <Text> component" -- the icon is wrapped in a
  // View, and a raw string cannot live there.
  leftIcon?: React.ReactElement;
  rightIcon?: React.ReactElement;
  hapticFeedback?: boolean;
};

const SIZE_STYLES = {
  xs: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 24, fontSize: 14 },
  sm: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 24, fontSize: 16 },
  md: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 100, fontSize: 18 },
  lg: { paddingVertical: 12, paddingHorizontal: 40, borderRadius: 100, fontSize: 24 }
} as const;

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
    transform: [{ scale: 1 - pressed.value * 0.04 }],
    opacity: restingOpacity - pressed.value * (1 - APP_ACTIVE_OPACITY)
  }));

  if (!onPress && !href) return null;

  const handlePress = () => {
    if (isDisabled) return;
    if (hapticFeedback) hapticLight();
    onPress?.();
    if (href) router.push(href);
  };

  const handlePressIn = () => {
    pressed.value = withTiming(1, { duration: PRESS_DURATION_MS });
  };

  const handlePressOut = () => {
    pressed.value = withTiming(0, { duration: PRESS_DURATION_MS });
  };

  const { paddingVertical, paddingHorizontal, borderRadius, fontSize } = SIZE_STYLES[size];

  // Below iOS 26 there is no material to render, so glass borrows `secondary`'s
  // fill. Its label is `text`'s primary either way -- onPrimary white would
  // disappear against clear glass over a light page.
  const fillVariant = variant === 'glass' ? 'secondary' : variant;
  const labelVariant = variant === 'glass' ? 'text' : variant;

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
          (isDisabled || isLoading) && styles.disabled,
          containerStyle
        ]}>
        <Pressable
          onPress={handlePress}
          disabled={isDisabled || isLoading}
          style={[styles.base, { paddingVertical, paddingHorizontal }]}>
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
      style={[
        styles.base,
        styles[fillVariant],
        { paddingVertical, paddingHorizontal, borderRadius },
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
      backgroundColor: colors.backgroundSelected
    },
    destructive: {
      backgroundColor: colors.error
    },
    text: {
      backgroundColor: 'transparent'
    },
    glassSurface: {
      alignSelf: 'stretch',
      overflow: 'hidden',
      borderCurve: 'continuous'
    },
    disabled: {
      opacity: 0.5
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
      color: colors.primary
    }
  });

export default MainButton;
