import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

const AVATAR_SIZE = 48;

/**
 * Dashed and unfilled, deliberately quieter than a real pet. It reads as an
 * offer rather than as a pet nobody has finished setting up.
 */
const AddPetGhostRow = () => {
  const styles = useStyles(makeStyles);

  return (
    <Link href="/home/add-pet" asChild>
      <PressableOpacity style={styles.row} accessibilityLabel="Add a pet">
        <View style={styles.well}>
          <Icon name="plus" size={22} color="text" />
        </View>

        <AppText size={15}>Add a pet</AppText>
      </PressableOpacity>
    </Link>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.ghostBorder
    },
    well: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSelected
    }
  });

export default AddPetGhostRow;
