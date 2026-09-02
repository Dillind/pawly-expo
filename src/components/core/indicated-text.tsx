import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import { ThemeColor } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  marginTop?: number;
  marginBottom?: number;
  text: string;
  textColor?: ThemeColor;
};

const IndicatedText = ({ marginBottom, marginTop, text, textColor }: Props) => {
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.container, { marginTop, marginBottom }]}>
      <AppText size={16} color={textColor ?? 'text'}>
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
