import { StyleSheet, View } from 'react-native';

import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';

import AppText from './app-text';
import PressableOpacity from './pressable-opacity';

type Option<T> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  marginTop?: number;
  marginBottom?: number;
  label?: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

const SegmentedControl = <T extends string>({
  marginTop,
  marginBottom,
  label,
  options,
  value,
  onChange
}: Props<T>) => {
  const styles = useStyles(makeStyles);

  const handlePress = (option: Option<T>) => {
    if (option.value === value) return;

    void hapticLight();
    onChange(option.value);
  };

  return (
    <View style={[styles.container, { marginTop, marginBottom }]}>
      {label ? (
        <AppText size={14} fontWeight="bold">
          {label}
        </AppText>
      ) : null}
      <View style={styles.track}>
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <PressableOpacity
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isSelected }}
              style={[styles.segment, isSelected && styles.segmentSelected]}
              onPress={() => handlePress(option)}>
              <AppText
                size={14}
                align="center"
                fontWeight={isSelected ? 'bold' : 'regular'}
                color={isSelected ? 'text' : 'textSecondary'}>
                {option.label}
              </AppText>
            </PressableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      gap: spacing.two
    },
    track: {
      flexDirection: 'row',
      gap: spacing.one,
      padding: spacing.one,
      borderRadius: 12,
      backgroundColor: colors.backgroundElement
    },
    segment: {
      flex: 1,
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.two,
      borderRadius: 10
    },
    segmentSelected: {
      backgroundColor: colors.backgroundSelected
    }
  });

export default SegmentedControl;
