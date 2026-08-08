import { APP_ACTIVE_OPACITY } from '@/constants/primitives';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
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

type MainButtonProps = {
  text: string;
  containerStyle?: StyleProp<ViewStyle>;
  isLoading?: boolean;
  onPress?: () => void;
  href?: Href;
  isDisabled?: boolean;
  /**
   * `secondary` is drawn in `error` -- it is the destructive button, despite
   * the name. `neutral` is the quiet companion to `primary`: Back, Cancel,
   * anything paired with the action that matters.
   */
  variant?: 'primary' | 'secondary' | 'neutral' | 'text';
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
  const router = useRouter();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.04 }],
    opacity: 1 - pressed.value * (1 - APP_ACTIVE_OPACITY)
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

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled || isLoading}
      style={[
        styles.base,
        styles[variant],
        { paddingVertical, paddingHorizontal, borderRadius },
        (isDisabled || isLoading) && styles.disabled,
        containerStyle,
        animatedStyle
      ]}>
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? '#ffffff' : undefined}
            style={styles.icon}
          />
        ) : (
          leftIcon && <View style={styles.icon}>{leftIcon}</View>
        )}
        <Text
          style={[styles.label, styles[`${variant}Label` as keyof typeof styles], { fontSize }]}>
          {text}
        </Text>
        {!isLoading && rightIcon && <View style={styles.icon}>{rightIcon}</View>}
      </View>
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
      backgroundColor: colors.error
    },
    neutral: {
      backgroundColor: colors.backgroundSelected
    },
    text: {
      backgroundColor: 'transparent'
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
      color: '#ffffff'
    },
    secondaryLabel: {
      color: '#ffffff'
    },
    neutralLabel: {
      color: colors.text
    },
    textLabel: {
      color: colors.primary
    }
  });

export default MainButton;
