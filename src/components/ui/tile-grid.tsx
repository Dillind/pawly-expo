import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import AppText from '@/components/core/app-text';
import Tile from '@/components/ui/tile';
import type { IconName } from '@/constants/icon-map';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

export type TileDescriptor = {
  id: string;
  label: string;
  icon: IconName;
  span: 1 | 2;
  href: string;
};

type Props = {
  tiles: TileDescriptor[];
};

// Module scope on purpose: tiles animate once per app launch, not once per
// focus. A ref would reset on every tab switch and replay the entrance.
let hasAnimated = false;

const TileGrid = ({ tiles }: Props) => {
  const styles = useStyles(makeStyles);
  const shouldAnimate = tiles.length > 0 && !hasAnimated;

  useEffect(() => {
    if (tiles.length > 0) hasAnimated = true;
  }, [tiles.length]);

  if (tiles.length === 0) return null;

  return (
    <View style={styles.section}>
      {/* Quiet and secondary: the tiles are the content, and a bold heading
          competes with them. */}
      <AppText size={17} color="textSecondary">
        Dashboard
      </AppText>

      <View style={styles.grid}>
        {tiles.map((tile, index) => (
          <Animated.View
            key={tile.id}
            entering={
              shouldAnimate
                ? FadeInDown.delay(index * 60)
                    .springify()
                    .reduceMotion(ReduceMotion.System)
                : undefined
            }
            style={tile.span === 2 ? styles.full : styles.half}>
            <Tile label={tile.label} icon={tile.icon} href={tile.href} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    section: {
      gap: spacing.two + spacing.one
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: spacing.three,
      marginHorizontal: -spacing.two
    },
    // No flexGrow: a span-1 tile stays half width even when it is the only one
    // in the row. Growing it made a lone tile fill the row and stop reading as
    // a tile at all.
    half: {
      flexBasis: '50%',
      paddingHorizontal: spacing.two
    },
    full: {
      flexBasis: '100%',
      paddingHorizontal: spacing.two
    }
  });

export default TileGrid;
