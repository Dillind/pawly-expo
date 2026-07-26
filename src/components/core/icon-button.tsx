import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { IconName } from '@/constants/icon-map';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  StyleSheet,
  type ViewStyle
} from 'react-native';

const MIN_TAP_TARGET = 44;

type Props = {
  name: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass';
  size?: number;
  isLoading?: boolean;
  isDisabled?: boolean;
  hapticFeedback?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

const IconButton = ({
  name,
  accessibilityLabel,
  onPress,
  variant = 'primary',
  size = 24,
  isLoading = false,
  isDisabled = false,
  hapticFeedback = true,
  containerStyle
}: Props) => {
  const styles = useStyles(makeStyles);

  const isInactive = isDisabled || isLoading;

  const handlePress = () => {
    if (isInactive) return;
    if (hapticFeedback) void hapticLight();
    onPress?.();
  };

  const glyphColor = variant === 'ghost' ? 'text' : variant === 'glass' ? 'primary' : 'onPrimary';

  const content = isLoading ? (
    <ActivityIndicator size="small" color={variant === 'primary' ? '#ffffff' : undefined} />
  ) : (
    <Icon name={name} size={size} color={glyphColor} />
  );

  // Glass owns its own press response via `isInteractive` -- the material
  // deforms natively. Layering PressableOpacity's opacity fade on top fights
  // it, and expo-glass-effect explicitly warns against animating opacity.
  if (variant === 'glass') {
    return (
      <GlassView
        isInteractive
        style={[styles.base, styles.glass, isInactive && styles.disabled, containerStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ disabled: isInactive, busy: isLoading }}
          disabled={isInactive}
          onPress={handlePress}
          style={styles.glassPressable}>
          {content}
        </Pressable>
      </GlassView>
    );
  }

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isInactive, busy: isLoading }}
      disabled={isInactive}
      onPress={handlePress}
      style={[styles.base, styles[variant], isInactive && styles.disabled, containerStyle]}>
      {content}
    </PressableOpacity>
  );
};

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    base: {
      alignSelf: 'center',
      minWidth: MIN_TAP_TARGET,
      minHeight: MIN_TAP_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.full
    },
    glass: {
      // Below iOS 26 GlassView degrades to a plain, transparent View -- without
      // a backing colour the button would be an invisible tap target.
      backgroundColor: isLiquidGlassAvailable() ? undefined : colors.backgroundElement,
      overflow: 'hidden'
    },
    glassPressable: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center'
    },
    primary: {
      backgroundColor: colors.primary
    },
    secondary: {
      backgroundColor: colors.error
    },
    ghost: {
      backgroundColor: 'transparent'
    },
    disabled: {
      opacity: 0.5
    }
  });

export default IconButton;
