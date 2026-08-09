import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { IconName } from '@/constants/icon-map';
import { Radius, type AppTheme, type ThemeColor } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight } from '@/lib/haptics';
import { hasGlass } from '@/utils/platform';
import { GlassView } from 'expo-glass-effect';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle
} from 'react-native';

const MIN_TAP_TARGET = 44;

type Props = {
  name: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass';
  color?: ThemeColor;
  size?: number;
  strokeWidth?: number;
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
  color,
  size = 24,
  strokeWidth,
  isLoading = false,
  isDisabled = false,
  hapticFeedback = true,
  containerStyle
}: Props) => {
  const styles = useStyles(makeStyles);
  const { isDark } = useTheme();

  const isInactive = isDisabled || isLoading;

  const handlePress = () => {
    if (isInactive) return;
    if (hapticFeedback) void hapticLight();
    onPress?.();
  };

  const glyphColor =
    color ?? (variant === 'ghost' ? 'text' : variant === 'glass' ? 'primary' : 'onPrimary');

  const content = isLoading ? (
    <ActivityIndicator size="small" color={variant === 'primary' ? '#ffffff' : undefined} />
  ) : (
    <Icon name={name} size={size} color={glyphColor} strokeWidth={strokeWidth} />
  );

  if (variant === 'glass' && hasGlass) {
    return (
      <GlassView
        isInteractive
        colorScheme={isDark ? 'dark' : 'light'}
        style={[styles.base, styles.glassSurface, isInactive && styles.disabled, containerStyle]}>
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
    // GlassView fits itself to the view it is given, so the minimums alone let
    // it stretch to its parent's height and the circle becomes a capsule.
    glassSurface: {
      width: MIN_TAP_TARGET,
      height: MIN_TAP_TARGET,
      overflow: 'hidden'
    },
    glass: {
      backgroundColor: colors.backgroundElement,
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
