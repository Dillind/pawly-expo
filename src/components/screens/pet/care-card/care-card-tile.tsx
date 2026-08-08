import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

export const TILE_WIDTH = 58;
export const TILE_HEIGHT = 80;

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
 */
const CareCardTile = ({ petName, isDisabled, isHidden, onPress }: Props) => {
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
      accessibilityLabel={`${petName}'s Care Card`}
      style={styles.container}
      disabled={isDisabled}
      onPress={handlePress}>
      <View ref={tileRef} style={[styles.tile, isHidden && styles.hidden]}>
        <Icon name="pawPrint" size={12} color="onPrimary" />
        <View style={styles.rules}>
          <View style={[styles.rule, styles.ruleLong]} />
          <View style={[styles.rule, styles.ruleShort]} />
          <View style={[styles.rule, styles.ruleMedium]} />
        </View>
      </View>

      <AppText size={11} color="textSecondary" align="center">
        Care Card
      </AppText>
    </PressableOpacity>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    container: { alignItems: 'center', gap: spacing.one },
    tile: {
      width: TILE_WIDTH,
      height: TILE_HEIGHT,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      padding: spacing.two,
      justifyContent: 'space-between',
      backgroundColor: colors.primary
    },
    // Kept mounted so its frame stays measurable, but hidden so it does not
    // show beneath the card that grew out of it.
    hidden: { opacity: 0 },
    rules: { gap: 3 },
    rule: { height: 3, borderRadius: 2, backgroundColor: colors.onPrimary, opacity: 0.55 },
    ruleLong: { width: '85%' },
    ruleShort: { width: '55%' },
    ruleMedium: { width: '70%' }
  });

export default CareCardTile;
