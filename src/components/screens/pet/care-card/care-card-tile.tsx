import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { createShadowMedium } from '@/lib/styles/shadows';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

const WELL_SIZE = 44;

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
      <View
        ref={tileRef}
        style={[styles.tile, createShadowMedium(theme.colors), isHidden && styles.hidden]}>
        <View style={styles.well}>
          <Icon name="clipboardList" size={22} color="text" />
        </View>

        <View style={styles.body}>
          <AppText variant="header" size={17} fontWeight="bold">
            {`${petName}'s care card`}
          </AppText>
          <AppText size={13} color="textSecondary">
            Everything a sitter needs. Tap to open.
          </AppText>
        </View>
      </View>
    </PressableOpacity>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    tile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      padding: spacing.three,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
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
    },
    body: { flex: 1, gap: spacing.half }
  });

export default CareCardTile;
