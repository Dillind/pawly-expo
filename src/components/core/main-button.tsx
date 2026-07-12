import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { hapticLight } from '@/lib/haptics';
import { createShadowMedium } from '@/lib/styles/shadows';
import { type Href, Link } from 'expo-router';
import React, { type FunctionComponent } from 'react';
import { ActivityIndicator, StyleProp, ViewStyle } from 'react-native';

type MainButtonProps = {
  text: string;
  containerStyle?: StyleProp<ViewStyle>;
  isLoading?: boolean;
  onPress?: () => void;
  href?: Href;
  isDisabled?: boolean;
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'sm' | 'md' | 'lg' | 'xs';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  hapticFeedback?: boolean;
};

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
  hapticFeedback = false
}) => {
  const theme = useTheme();
  const styles = useThemedStyles((colors) => ({
    containerPrimary: {
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 100,
      ...createShadowMedium(colors)
    },
    containerSecondary: {
      borderRadius: 100,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.textSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      ...createShadowMedium(colors)
    },
    containerText: {
      justifyContent: 'center',
      alignItems: 'center'
    },
    containerGradient: {
      borderRadius: 100,
      justifyContent: 'center',
      alignItems: 'center'
    },
    gradientBorder: {
      padding: 2,
      borderRadius: 100
    },
    innerButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: colors.background,
      borderRadius: 100,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      width: '100%',
      height: 48
    },
    sizeExtraSmall: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      minWidth: 88,
      borderRadius: 24
    },
    sizeSmall: {
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 24
    },
    sizeMedium: {
      paddingVertical: 12,
      paddingHorizontal: 24
    },
    sizeLarge: {
      paddingVertical: 12,
      paddingHorizontal: 40
    }
  }));

  const getButtonStyles = (): StyleProp<ViewStyle> => {
    const baseStyle = (() => {
      switch (variant) {
        case 'primary':
          return styles.containerPrimary;
        case 'secondary':
          return styles.containerSecondary;
        case 'text':
          return styles.containerText;
        default:
          return styles.containerPrimary;
      }
    })();

    const sizeStyle = (() => {
      switch (size) {
        case 'xs':
          return styles.sizeExtraSmall;
        case 'sm':
          return styles.sizeSmall;
        case 'lg':
          return styles.sizeLarge;
        default:
          return styles.sizeMedium;
      }
    })();

    return [baseStyle, sizeStyle];
  };

  const getTextColor = (): ThemeColor => {
    switch (variant) {
      case 'primary':
        return 'text';
      case 'secondary':
        return 'background';
      case 'text':
        return 'text';
      default:
        return 'text';
    }
  };

  const getTextSize = (): number => {
    switch (size) {
      case 'xs':
        return 14;
      case 'sm':
        return 16;
      case 'md':
        return 18;
      case 'lg':
        return 24;
      default:
        return 16;
    }
  };

  const handlePress = () => {
    if (!isDisabled && hapticFeedback) hapticLight();
    onPress?.();
  };

  if (href) {
    return (
      <Link
        href={href}
        asChild
        disabled={isDisabled}
        style={[
          { flexDirection: 'row', gap: 4 },
          getButtonStyles() as any,
          containerStyle as any,
          isDisabled && { opacity: 0.5 }
        ]}>
        <PressableOpacity onPress={handlePress}>
          {leftIcon && !isLoading && leftIcon}
          {isLoading && <ActivityIndicator color={theme[getTextColor()]} />}
          <AppText size={getTextSize()} color={getTextColor()} fontWeight="bold">
            {text}
          </AppText>
          {rightIcon && !isLoading && rightIcon}
        </PressableOpacity>
      </Link>
    );
  }

  if (onPress) {
    return (
      <PressableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        style={[
          { flexDirection: 'row', gap: 4 },
          getButtonStyles(),
          containerStyle,
          isDisabled && { opacity: 0.5 }
        ]}>
        {leftIcon && !isLoading && leftIcon}
        {isLoading && <ActivityIndicator color={theme[getTextColor()]} />}
        <AppText size={getTextSize()} color={getTextColor()} fontWeight="bold">
          {text}
        </AppText>
        {rightIcon && !isLoading && rightIcon}
      </PressableOpacity>
    );
  }

  return null;
};

export default MainButton;
