import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { createShadowMedium } from '@/lib/styles/shadows';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

const TILE_WIDTH = 84;
const TILE_HEIGHT = 126;
const TILE_PADDING = 12;
const WELL_SIZE = 32;

/** The three ruled lines standing in for the card's written contents. */
const LINE_WIDTHS = ['100%', '78%', '56%'] as const;

/** Window coordinates, so the overlay can start its morph here. */
export type TileFrame = { x: number; y: number; width: number; height: number };

type Props = {
  petName: string;
  isDisabled: boolean;
  isHidden: boolean;
  onPress: (frame: TileFrame) => void;
};

/**
 * Always drawn as a card, filled or not. An empty-looking tile promised a
 * different destination than the one tapping it reaches -- the card opens
 * either way, and asks to be started from there.
 *
 * It is a small portrait tile so it can stand beside the pet's avatar, and it
 * is drawn as a card rather than described in words: at this size the ruled
 * lines say "a written card" faster than a label would.
 *
 * The icon is warm ink on a sunk well, never gold. Gold is the Log chip.
 */
const CareCardTile = ({ petName, isDisabled, isHidden, onPress }: Props) => {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const tileRef = useRef<View | null>(null);

  const handlePress = () => {
    tileRef.current?.measureInWindow((x, y, width, height) => {
      onPress({ x, y, width, height });
    });
  };

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${petName}'s care card`}
      disabled={isDisabled}
      onPress={handlePress}>
      <View style={styles.column}>
        <View
          ref={tileRef}
          style={[styles.tile, createShadowMedium(theme.colors), isHidden && styles.hidden]}>
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
    // Kept mounted so its frame stays measurable, but hidden so it does not
    // show beneath the card that grew out of it.
    hidden: { opacity: 0 },
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
