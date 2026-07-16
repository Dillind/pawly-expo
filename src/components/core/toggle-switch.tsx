import { Toggle } from '@expo/ui/swift-ui';
import { StyleSheet, View } from 'react-native';

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
  return (
    <View style={{ ...styles.container, marginBottom, marginTop }}>
      <AppText size={14} color="text" fontWeight="regular">
        {description}
      </AppText>
      <Toggle label={label} isOn={value} onIsOnChange={onChange} />
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
