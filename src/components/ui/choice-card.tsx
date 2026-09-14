import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { IconName } from '@/constants/icon-map';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

const TICK = 22;

type Props = {
  icon: IconName;
  label: string;
  description: string;
  isSelected: boolean;
  onPress: () => void;
};

// One of two or three answers, each of which needs a sentence to be fair to it.
// A switch cannot carry that sentence, and a radio list makes both options look
// like the same answer twice.
const ChoiceCard = ({ icon, label, description, isSelected, onPress }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <PressableOpacity
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${label}. ${description}`}
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onPress}>
      <Icon name={icon} size={20} color={isSelected ? 'primaryText' : 'textSecondary'} />

      <View style={styles.body}>
        <AppText size={16} fontWeight="semibold">
          {label}
        </AppText>
        <AppText size={13} color="textSecondary">
          {description}
        </AppText>
      </View>

      <View style={[styles.tick, isSelected && styles.tickSelected]}>
        {isSelected && <Icon name="check" size={13} color="onPrimary" strokeWidth={3.4} />}
      </View>
    </PressableOpacity>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.three,
      padding: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundElement
    },
    cardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted
    },
    body: {
      flex: 1,
      gap: 2
    },
    tick: {
      width: TICK,
      height: TICK,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.ghostBorder
    },
    tickSelected: {
      borderColor: 'transparent',
      backgroundColor: colors.primary
    }
  });

export default ChoiceCard;
