import Animated, { FadeInDown } from 'react-native-reanimated';
import Tile from '@/components/ui/tile';
import type { TileDescriptor } from '@/components/ui/home-tiles';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  tiles: TileDescriptor[];
};

// Module scope on purpose: tiles animate once per app launch, not once per
// focus. A ref would reset on every tab switch and replay the entrance.
let hasAnimated = false;

const TileGrid = ({ tiles }: Props) => {
  const styles = useStyles(makeStyles);
  const isReduced = useReducedMotion();
  const shouldAnimate = !hasAnimated && !isReduced;

  useEffect(() => {
    hasAnimated = true;
  }, []);

  if (tiles.length === 0) return null;

  return (
    <View style={styles.grid}>
      {tiles.map((tile, index) => (
        <Animated.View
          key={tile.id}
          entering={shouldAnimate ? FadeInDown.delay(index * 60).springify() : undefined}
          style={tile.span === 2 ? styles.full : styles.half}>
          <Tile label={tile.label} icon={tile.icon} href={tile.href} />
        </Animated.View>
      ))}
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.three },
    half: { flexBasis: '48%', flexGrow: 1 },
    full: { flexBasis: '100%' }
  });

export default TileGrid;
