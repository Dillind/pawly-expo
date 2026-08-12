import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { IconName } from '@/constants/icon-map';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  label: string;
  icon?: IconName;
  leading?: ReactNode;
  isSelected?: boolean;
  isDestructive?: boolean;
  isCheckbox?: boolean;
  onPress: () => void;
};

const SheetRow = ({
  label,
  icon,
  leading,
  isSelected = false,
  isDestructive = false,
  isCheckbox = false,
  onPress
}: Props) => {
  const styles = useStyles(makeStyles);
  const tone = isDestructive ? 'error' : 'text';

  return (
    <PressableOpacity
      accessibilityRole={isCheckbox ? 'checkbox' : 'button'}
      accessibilityLabel={label}
      accessibilityState={isCheckbox ? { checked: isSelected } : { selected: isSelected }}
      onPress={onPress}>
      <View style={styles.row}>
        {leading ?? (icon && <Icon name={icon} size={22} color={tone} />)}

        <AppText size={17} color={tone} style={styles.label}>
          {label}
        </AppText>

        {isSelected && <Icon name="check" size={20} color="primary" />}
      </View>
    </PressableOpacity>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.three,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundSheetRow
    },
    label: {
      flex: 1
    }
  });

export default SheetRow;
