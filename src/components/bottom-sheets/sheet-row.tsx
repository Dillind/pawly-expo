import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { IconName } from '@/constants/icon-map';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  label: string;
  /** Secondary text on the right, before any tick. */
  detail?: string;
  icon?: IconName;
  leading?: ReactNode;
  isSelected?: boolean;
  isDestructive?: boolean;
  isCheckbox?: boolean;
  /**
   * Where the row is drawn. `backgroundSheetRow` is the screen background in
   * light mode, so it only contrasts inside a sheet.
   */
  surface?: 'sheet' | 'screen';
  onPress: () => void;
};

const SheetRow = ({
  label,
  detail,
  icon,
  leading,
  isSelected = false,
  isDestructive = false,
  isCheckbox = false,
  surface = 'sheet',
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
      <View style={[styles.row, surface === 'screen' && styles.onScreen]}>
        {leading ?? (icon && <Icon name={icon} size={22} color={tone} />)}

        <AppText size={17} color={tone} style={styles.label}>
          {label}
        </AppText>

        {detail && (
          <AppText size={14} color="textSecondary">
            {detail}
          </AppText>
        )}

        {isSelected && <Icon name="check" size={20} color="success" />}
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
    onScreen: {
      backgroundColor: colors.backgroundElement
    },
    label: {
      flex: 1
    }
  });

export default SheetRow;
