import { StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

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
    <View style={[styles.container, { marginBottom, marginTop }]}>
      <View style={styles.textColumn}>
        <AppText size={14} color="text" fontWeight="bold">
          {label}
        </AppText>
        <AppText size={13} color="textSecondary" fontWeight="regular">
          {description}
        </AppText>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.colors.primary }} />
    </View>
  );
};

export default ToggleSwitch;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  textColumn: {
    flex: 1,
    gap: 2
  }
});
