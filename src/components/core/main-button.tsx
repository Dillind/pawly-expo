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

const sizeStyles = {
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
  hapticFeedback = false
}) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  if (!onPress && !href) return null;

  const handlePress = () => {
    if (isDisabled) return;
    if (hapticFeedback) hapticLight();
    onPress?.();
    if (href) router.push(href);
  };

  const { paddingVertical, paddingHorizontal, borderRadius, fontSize } = sizeStyles[size];
  const hasIcons = Boolean(leftIcon) || Boolean(rightIcon);

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled || isLoading}
      style={[
        styles.base,
        styles[variant],
        { paddingVertical, paddingHorizontal, borderRadius },
        (isDisabled || isLoading) && styles.disabled,
        containerStyle
      ]}>
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? '#ffffff' : undefined}
            style={styles.icon}
          />
        ) : (
          hasIcons && leftIcon && <View style={styles.icon}>{leftIcon}</View>
        )}
        <Text
          style={[
            styles.label,
            styles[`${variant}Label` as keyof typeof styles],
            { fontSize }
          ]}>
          {text}
        </Text>
        {!isLoading && rightIcon && <View style={styles.icon}>{rightIcon}</View>}
      </View>
    </Pressable>
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
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary
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
      color: colors.primary
    },
    textLabel: {
      color: colors.primary
    }
  });

export default MainButton;
