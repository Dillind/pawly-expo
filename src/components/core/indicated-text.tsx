import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import { ThemeColor } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { FontWeight } from '@/types/core';

type Props = {
  marginTop?: number;
  marginBottom?: number;
  text: string;
  textColor?: ThemeColor;
  size?: number;
  fontWeight?: FontWeight;
};

const IndicatedText = ({
  marginBottom,
  marginTop,
  text,
  textColor,
  size = 16,
  fontWeight = 'regular'
}: Props) => {
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.container, { marginTop, marginBottom }]}>
      <AppText size={size} fontWeight={fontWeight} color={textColor ?? 'text'}>
        {text}
      </AppText>
      <Icon name="asterisk" size={12} color="error" />
    </View>
  );
};

export default IndicatedText;

const makeStyles = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'row'
    }
  });
