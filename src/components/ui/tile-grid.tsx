import Tile from '@/components/ui/tile';
import type { TileDescriptor } from '@/components/ui/home-tiles';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

type Props = {
  tiles: TileDescriptor[];
};

const TileGrid = ({ tiles }: Props) => {
  const styles = useStyles(makeStyles);

  if (tiles.length === 0) return null;

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <View key={tile.id} style={tile.span === 2 ? styles.full : styles.half}>
          <Tile label={tile.label} icon={tile.icon} href={tile.href} />
        </View>
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
