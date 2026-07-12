import { useTheme } from '@/hooks/use-theme';
import { StyleSheet, Switch, View } from 'react-native';
import AppText from './app-text';

type Props = {
  marginTop?: number;
  marginBottom?: number;
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

const ToggleSwitch = ({ marginBottom, marginTop, label, description, value, onChange }: Props) => {
  const theme = useTheme();
  return (
    <View style={{ ...styles.container, marginBottom, marginTop }}>
      <View style={{ flex: 1 }}>
        <AppText size={14} color="text" fontWeight="bold">
          {label}
        </AppText>
        <AppText size={14} color="text" fontWeight="regular">
          {description}
        </AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        thumbColor={theme.background}
        trackColor={{ true: theme.background, false: theme.background }}
      />
    </View>
  );
};

export default ToggleSwitch;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between'
  }
});
