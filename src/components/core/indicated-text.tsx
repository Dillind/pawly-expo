import AppText from '@/components/core/app-text';
import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { AsteriskIcon } from 'phosphor-react-native';
import { View } from 'react-native';

type Props = {
  marginTop?: number;
  marginBottom?: number;
  text: string;
  textColor?: ThemeColor;
};

const IndicatedText = ({ marginBottom, marginTop, text, textColor }: Props) => {
  const theme = useTheme();
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
      <AsteriskIcon size={16} color={theme.text} />
    </View>
  );
};

export default IndicatedText;
