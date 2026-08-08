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
  isFilled: boolean;
  isDisabled: boolean;
  isHidden: boolean;
  onPress: (frame: TileFrame) => void;
};

const CareCardTile = ({ petName, isFilled, isDisabled, isHidden, onPress }: Props) => {
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
      accessibilityLabel={
        isFilled ? `${petName}'s Care Card` : `Set up a Care Card for ${petName}`
      }
      style={styles.container}
      disabled={isDisabled}
      onPress={handlePress}>
      <View
        ref={tileRef}
        style={[
          styles.tile,
          isFilled ? styles.tileFilled : styles.tileEmpty,
          isHidden && styles.hidden
        ]}>
        {isFilled ? (
          <>
            <Icon name="pawPrint" size={12} color="onPrimary" />
            <View style={styles.rules}>
              <View style={[styles.rule, styles.ruleLong]} />
              <View style={[styles.rule, styles.ruleShort]} />
              <View style={[styles.rule, styles.ruleMedium]} />
            </View>
          </>
        ) : (
          <Icon name="plus" size={20} color="textSecondary" />
        )}
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
      justifyContent: 'space-between'
    },
    tileFilled: { backgroundColor: colors.primary },
    tileEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.textSecondary,
      backgroundColor: colors.backgroundElement
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
