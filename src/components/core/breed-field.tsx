import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

type Props = {
  value: string | null;
  description?: string;
  onPress: () => void;
};

const BreedField = ({ value, description, onPress }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.field}>
      <AppText size={14} fontWeight="bold">
        Breed
      </AppText>

      <PressableOpacity
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={value ? `Breed: ${value}` : 'Choose a breed'}
        onPress={onPress}>
        <AppText size={16} color={value ? 'text' : 'textSecondary'} style={styles.value}>
          {value ?? 'Choose a breed'}
        </AppText>
        <Icon name="caretRight" size={16} color="textSecondary" />
      </PressableOpacity>

      {description && (
        <AppText size={13} color="textSecondary">
          {description}
        </AppText>
      )}
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    field: {
      gap: spacing.two
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border
    },
    value: {
      flex: 1
    }
  });

export default BreedField;
