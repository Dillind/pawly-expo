import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import { ThemeColor } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { View } from 'react-native';

type Props = {
  marginTop?: number;
  marginBottom?: number;
  text: string;
  textColor?: ThemeColor;
};

const IndicatedText = ({ marginBottom, marginTop, text, textColor }: Props) => {
  const styles = useThemedStyles(() => ({
    container: {
      flexDirection: 'row'
    }
  }));

  return (
    <View style={[styles.container, { marginTop, marginBottom }]}>
      <AppText size={16} color={textColor ?? 'text'}>
        {text}
      </AppText>
      <Icon name="asterisk" size={16} />
    </View>
  );
};

export default IndicatedText;
