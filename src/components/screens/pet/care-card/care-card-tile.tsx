import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { IconSize, Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight } from '@/lib/haptics';
import { createShadowMedium } from '@/lib/styles/shadows';

export const TileWidth = 64;
export const TileHeight = 96;
const TILE_PADDING = 8;
const WELL_SIZE = 26;

const LINE_WIDTHS = ['100%', '78%', '56%'] as const;

type Props = {
  petName: string;
  onPress?: () => void;
};

const CareCardTile = ({ petName, onPress }: Props) => {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${petName}'s care card`}
      onPress={() => {
        void hapticLight();
        onPress?.();
      }}>
      <View style={styles.column}>
        <View style={[styles.tile, createShadowMedium(theme.colors)]}>
          <View style={styles.well}>
            <Icon name="pawPrint" size={IconSize.inline} color="primaryText" />
          </View>

          <View style={styles.lines}>
            {LINE_WIDTHS.map((width) => (
              <View key={width} style={[styles.line, { width }]} />
            ))}
          </View>
        </View>

        <AppText size={11} color="textSecondary">
          Care card
        </AppText>
      </View>
    </PressableOpacity>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    column: {
      alignItems: 'center',
      gap: spacing.one
    },
    tile: {
      width: TileWidth,
      height: TileHeight,
      justifyContent: 'space-between',
      padding: TILE_PADDING,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    lines: {
      alignSelf: 'stretch',
      gap: 4
    },
    line: {
      height: 4,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundSelected
    },
    well: {
      width: WELL_SIZE,
      height: WELL_SIZE,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryMuted
    }
  });

export default CareCardTile;
