import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { describePackedAge, isPackedStale } from '@/lib/travel-packing';

const GLYPH = 36;
const RESET_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 };

type Props = {
  packedAt: string;
  petNames: string[];
  isResetting: boolean;
  onReset: () => void;
};

const readyLine = (petNames: string[]) => {
  if (petNames.length === 0) return 'All packed. Ready to go.';
  if (petNames.length === 1) return `All packed. ${petNames[0]} is ready to go.`;
  const last = petNames[petNames.length - 1];
  return `All packed. ${petNames.slice(0, -1).join(', ')} and ${last} are ready to go.`;
};

// Replaces the progress strip once every item is ticked. Fresh is green and a
// statement; after a week it goes neutral and asks. Reset is the only action.
const PackedCard = ({ packedAt, petNames, isResetting, onReset }: Props) => {
  const styles = useStyles(makeStyles);
  const isStale = isPackedStale(packedAt);
  const ink = isStale ? 'text' : 'onSuccess';

  return (
    <View style={[styles.card, isStale ? styles.cardStale : styles.cardFresh]}>
      <View style={[styles.glyph, isStale ? styles.glyphStale : styles.glyphFresh]}>
        <Icon name="check" size={20} color={ink} strokeWidth={2.2} />
      </View>

      <View style={styles.text}>
        <AppText variant="header" size={16} color={ink}>
          {isStale ? 'Packing for the next trip?' : readyLine(petNames)}
        </AppText>
        <AppText size={13} color={ink} style={styles.age}>
          Packed {describePackedAge(packedAt)}
        </AppText>
      </View>

      <PressableOpacity
        accessibilityRole="button"
        accessibilityLabel="Reset the checklist"
        disabled={isResetting}
        hitSlop={RESET_HIT_SLOP}
        style={[styles.reset, isStale ? styles.resetStale : styles.resetFresh]}
        onPress={onReset}>
        <Icon name="refresh" size={16} color={isStale ? 'onPrimary' : 'onSuccess'} />
        <AppText size={14} fontWeight="bold" color={isStale ? 'onPrimary' : 'onSuccess'}>
          Reset
        </AppText>
      </PressableOpacity>
    </View>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.three - spacing.half,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.card,
      borderCurve: 'continuous'
    },
    cardFresh: {
      backgroundColor: colors.success
    },
    cardStale: {
      backgroundColor: colors.backgroundSelected
    },
    glyph: {
      width: GLYPH,
      height: GLYPH,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center'
    },
    glyphFresh: {
      backgroundColor: 'rgba(255, 255, 255, 0.22)'
    },
    glyphStale: {
      backgroundColor: colors.ghostBorder
    },
    text: {
      flex: 1,
      gap: spacing.half
    },
    age: {
      opacity: 0.8
    },
    reset: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.one + spacing.half,
      height: 34,
      paddingHorizontal: spacing.three - spacing.half,
      borderRadius: Radius.full
    },
    resetFresh: {
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.35)'
    },
    resetStale: {
      backgroundColor: colors.primary
    }
  });

export default PackedCard;
