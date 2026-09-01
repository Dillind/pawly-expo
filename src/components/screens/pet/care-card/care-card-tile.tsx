import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { createShadowMedium } from '@/lib/styles/shadows';
import { StyleSheet, View } from 'react-native';

const TILE_WIDTH = 84;
const TILE_HEIGHT = 126;
const TILE_PADDING = 12;
const WELL_SIZE = 32;

/** The three ruled lines standing in for the card's written contents. */
const LINE_WIDTHS = ['100%', '78%', '56%'] as const;

type Props = {
  petName: string;
  onPress: () => void;
};

/**
 * Always drawn as a card, filled or not. An empty-looking tile promised a
 * different destination than the one tapping it reaches -- the screen opens
 * either way, and asks to be started from there.
 *
 * It is a small portrait tile so it can stand beside the pet's avatar, and it
 * is drawn as a card rather than described in words: at this size the ruled
 * lines say "a written card" faster than a label would.
 *
 * The icon is warm ink on a sunk well, never gold. Gold is the Log chip.
 */
const CareCardTile = ({ petName, onPress }: Props) => {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${petName}'s care card`}
      onPress={onPress}>
      <View style={styles.column}>
        <View style={[styles.tile, createShadowMedium(theme.colors)]}>
          <View style={styles.well}>
            <Icon name="pawPrint" size={18} color="text" />
          </View>

          <View style={styles.lines}>
            {LINE_WIDTHS.map((width) => (
              <View key={width} style={[styles.line, { width }]} />
            ))}
          </View>
        </View>

        <AppText size={12} color="textSecondary">
          Care card
        </AppText>
      </View>
    </PressableOpacity>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    column: { alignItems: 'center', gap: spacing.one },
    tile: {
      width: TILE_WIDTH,
      height: TILE_HEIGHT,
      justifyContent: 'space-between',
      padding: TILE_PADDING,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    lines: { alignSelf: 'stretch', gap: 5 },
    line: {
      height: 5,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundSelected
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

export default CareCardTile;
