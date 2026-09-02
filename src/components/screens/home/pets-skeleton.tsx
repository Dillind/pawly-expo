import ListCard from '@/components/core/list-card';
import { SkeletonBlock, SkeletonPulse } from '@/components/core/skeleton';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

const AVATAR_SIZE = 48;
const GHOST_HEIGHT = 80;
const ROW_WIDTHS = [
  { name: '40%', summary: '64%' },
  { name: '32%', summary: '52%' },
  { name: '36%', summary: '58%' }
] as const;

/**
 * The shape of the Pets list while it loads. The ghost row keeps its outline
 * rather than becoming a block: it is already an empty shape, so drawing it as
 * a placeholder would say the app is fetching something that is never fetched.
 */
const PetsSkeleton = () => {
  const styles = useStyles(makeStyles);

  return (
    <SkeletonPulse style={styles.container} accessibilityLabel="Loading pets">
      <ListCard style={styles.card}>
        {ROW_WIDTHS.map((row) => (
          <View key={row.name} style={styles.row}>
            <SkeletonBlock width={AVATAR_SIZE} height={AVATAR_SIZE} radius={Radius.full} />
            <View style={styles.body}>
              <SkeletonBlock width={row.name} height={16} />
              <SkeletonBlock width={row.summary} height={11} />
            </View>
          </View>
        ))}
      </ListCard>

      <View style={styles.ghost} />
    </SkeletonPulse>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      gap: spacing.three
    },
    card: {
      padding: spacing.three,
      gap: spacing.four
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14
    },
    body: {
      flex: 1,
      gap: spacing.two
    },
    ghost: {
      height: GHOST_HEIGHT,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.ghostBorder
    }
  });

export default PetsSkeleton;
