import { StyleSheet } from 'react-native';

import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import { CardPalette } from '@/constants/care-card-palette';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { CareCardRow } from '@/lib/care-card-view';

type Props = {
  number: CareCardRow;
  onCall: (number: CareCardRow) => void;
};

const CardNumber = ({ number, onCall }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Call ${number.label}, ${number.value}`}
      style={styles.number}
      onPress={() => onCall(number)}>
      <AppText size={11} fontWeight="bold" numberOfLines={1} style={[styles.ink, styles.label]}>
        {number.label}
      </AppText>
      <AppText size={19} fontWeight="bold" style={styles.ink}>
        {number.value}
      </AppText>
    </PressableOpacity>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    number: {
      alignItems: 'center',
      gap: spacing.half
    },
    ink: {
      color: CardPalette.onGold
    },
    // Letter-spaced small caps, the way a membership number is set on a real card.
    label: {
      letterSpacing: 1.1,
      textTransform: 'uppercase'
    }
  });

export default CardNumber;
