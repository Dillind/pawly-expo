import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

const WELL_SIZE = 32;

/**
 * Dashed and unfilled, the same offer the "Add a pet" row makes. It sits under
 * the real feed times and must read as quieter than any of them.
 */
const AddFeedTimeGhostRow = ({ onPress }: { onPress: () => void }) => {
  const styles = useStyles(makeStyles);

  return (
    <PressableOpacity
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel="Add a feed time"
      onPress={onPress}>
      <View style={styles.well}>
        <Icon name="plus" size={18} color="text" />
      </View>

      <AppText size={17}>Add a feed time</AppText>
    </PressableOpacity>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two + spacing.one,
      padding: spacing.three,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.ghostBorder
    },
    well: {
      width: WELL_SIZE,
      height: WELL_SIZE,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSelected
    }
  });

export default AddFeedTimeGhostRow;
