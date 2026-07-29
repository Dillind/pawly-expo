import { StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

import AppText from './app-text';

type Props = {
  marginTop?: number;
  marginBottom?: number;
  label: string;
  description: string;
  value: boolean;
  isDisabled?: boolean;
  onChange: (value: boolean) => void;
};

const ToggleSwitch = ({
  marginBottom,
  marginTop,
  label,
  description,
  value,
  isDisabled,
  onChange
}: Props) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { marginBottom, marginTop }]}>
      <View style={styles.textColumn}>
        {/* Both lines drop to textSecondary when disabled so the row reads as
            inert rather than merely unresponsive. */}
        <AppText size={14} color={isDisabled ? 'textSecondary' : 'text'} fontWeight="bold">
          {label}
        </AppText>
        <AppText size={13} color="textSecondary" fontWeight="regular">
          {description}
        </AppText>
      </View>
      <Switch
        value={value}
        disabled={isDisabled}
        onValueChange={onChange}
        trackColor={{ true: theme.colors.primary }}
      />
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
