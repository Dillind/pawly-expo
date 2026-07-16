import { useTheme } from '@/hooks/use-theme';
import { hapticLight } from '@/lib/haptics';
import {
  Button,
  Host,
  RNHostView,
  Row,
  Text,
  type ButtonVariant,
  type UniversalStyle
} from '@expo/ui';
import { type Href, useRouter } from 'expo-router';
import React, { type FunctionComponent, type ReactElement } from 'react';
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

const variantMap: Record<NonNullable<MainButtonProps['variant']>, ButtonVariant> = {
  primary: 'filled',
  secondary: 'outlined',
  text: 'text'
};

const sizeStyles: Record<NonNullable<MainButtonProps['size']>, UniversalStyle> = {
  xs: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 24 },
  sm: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 24 },
  md: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 100 },
  lg: { paddingVertical: 12, paddingHorizontal: 40, borderRadius: 100 }
};

const textSizes: Record<NonNullable<MainButtonProps['size']>, number> = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 24
};

const wrapReactNativeChild = (child: React.ReactNode) => {
  if (!child || !React.isValidElement(child)) return null;

  return <RNHostView matchContents>{child as ReactElement}</RNHostView>;
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
  const router = useRouter();

  if (!onPress && !href) return null;

  const hasCustomContent = isLoading || Boolean(leftIcon) || Boolean(rightIcon);

  const handlePress = () => {
    if (isDisabled) return;
    if (hapticFeedback) hapticLight();
    onPress?.();
    if (href) router.push(href);
  };

  return (
    <Host matchContents style={[{ alignSelf: 'stretch' }, containerStyle]}>
      <Button
        variant={variantMap[variant]}
        label={hasCustomContent ? undefined : text}
        onPress={handlePress}
        disabled={isDisabled}
        style={sizeStyles[size]}>
        {hasCustomContent ? (
          <Row alignment="center" spacing={8}>
            {isLoading ? (
              <RNHostView matchContents>
                <ActivityIndicator color={theme.colors.text} />
              </RNHostView>
            ) : (
              wrapReactNativeChild(leftIcon)
            )}
            <Text textStyle={{ fontSize: textSizes[size], fontWeight: 'bold' }}>{text}</Text>
            {!isLoading && wrapReactNativeChild(rightIcon)}
          </Row>
        ) : null}
      </Button>
    </Host>
  );
};

export default MainButton;
