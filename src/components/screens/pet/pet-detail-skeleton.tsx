import ListCard from '@/components/core/list-card';
import { SkeletonBlock, SkeletonPulse } from '@/components/core/skeleton';
import { PHOTO_HEADER_HEIGHT } from '@/components/screens/pet/pet-photo-header';
import { Radius, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

const PHOTO_TILE = 80;
const ROW_WIDTHS = ['150px', '170px', '130px'] as const;

/**
 * The shape of the pet screen while it loads. Every measurement is taken from
 * the real screen, so nothing moves when the pet arrives — change one and
 * change both.
 */
const PetDetailSkeleton = () => {
  const styles = useStyles(makeStyles);

  return (
    <SkeletonPulse accessibilityLabel="Loading this pet">
      <SkeletonBlock height={PHOTO_HEADER_HEIGHT} radius={0} />

      <View style={styles.names}>
        <SkeletonBlock width={140} height={28} radius={Radius.tile} />
        <SkeletonBlock width={200} height={12} />
      </View>

      <View style={styles.section}>
        <SkeletonBlock width={80} height={11} />
        <ListCard style={styles.card}>
          {ROW_WIDTHS.map((width) => (
            <View key={width} style={styles.row}>
              <SkeletonBlock width={parseInt(width, 10)} height={14} />
              <SkeletonBlock width={56} height={22} />
            </View>
          ))}
        </ListCard>
      </View>

      <View style={styles.strip}>
        <SkeletonBlock width={PHOTO_TILE} height={PHOTO_TILE} radius={Radius.tile} />
        <SkeletonBlock width={PHOTO_TILE} height={PHOTO_TILE} radius={Radius.tile} />
        <SkeletonBlock width={PHOTO_TILE} height={PHOTO_TILE} radius={Radius.tile} />
      </View>
    </SkeletonPulse>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    names: {
      paddingTop: spacing.three,
      paddingHorizontal: ScreenGutter,
      gap: spacing.two
    },
    section: {
      paddingTop: spacing.four,
      paddingHorizontal: ScreenGutter,
      gap: spacing.two
    },
    card: { padding: spacing.three, gap: 22 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    strip: {
      flexDirection: 'row',
      gap: spacing.two,
      paddingTop: spacing.four,
      paddingLeft: ScreenGutter
    }
  });

export default PetDetailSkeleton;
