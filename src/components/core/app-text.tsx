import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FontVariant, FontWeight } from '@/types/core';
import { isAndroid } from '@/utils/platform';
import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

type Props = {
  children?: React.ReactNode;
  variant?: FontVariant;
  size?: number;
  align?: 'left' | 'center' | 'right';
  color?: ThemeColor;
  fontWeight?: FontWeight;
  style?: StyleProp<TextStyle>;
  ellipsizeMode?: 'clip' | 'middle' | 'head' | 'tail';
  numberOfLines?: number;
  onPress?: () => void;
};

// A heading is Gabarito, body is Inter. The two faces are the type system --
// picking a weight of the body face for a heading loses the distinction.
const getFontFamily = (variant: FontVariant, fontWeight: FontWeight): string => {
  // Gabarito ships 600 and 700 only, so its `heading` face already is the
  // semibold one.
  if (variant === 'header') {
    return fontWeight === 'bold' ? Fonts.headingBold : Fonts.heading;
  }

  if (fontWeight === 'bold') return Fonts.bold;
  if (fontWeight === 'semibold') return Fonts.semiBold;
  return Fonts.regular;
};

const AppText = ({
  variant = 'body',
  children,
  size,
  align = 'left',
  color = 'text',
  fontWeight = 'regular',
  style,
  ellipsizeMode,
  numberOfLines,
  onPress
}: Props) => {
  const theme = useTheme();

  const getDefaultFontSize = (): number => {
    return variant === 'header' ? 32 : 16;
  };

  const fontSize = size ?? getDefaultFontSize();

  return (
    <Text
      onPress={onPress}
      style={[
        {
          fontFamily: getFontFamily(variant, fontWeight),
          fontSize,
          textAlign: align,
          color: theme.colors[color],
          lineHeight: isAndroid ? Math.round(fontSize * 1.25) : undefined,
          includeFontPadding: false
        },
        style
      ]}
      ellipsizeMode={ellipsizeMode}
      numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
};

export default AppText;
