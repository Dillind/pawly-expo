import ListCard from '@/components/core/list-card';
import { SkeletonBlock, SkeletonPulse } from '@/components/core/skeleton';
import { Radius, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

const AVATAR_SIZE = 140;
const CARE_CARD_WIDTH = 84;
const CARE_CARD_HEIGHT = 126;
const PHOTO_TILE = 80;
const ROW_WIDTHS = [150, 170, 130] as const;

/**
 * The shape of the pet screen while it loads. Every measurement is taken from
 * the real screen, so nothing moves when the pet arrives — change one and
 * change both.
 */
const PetDetailSkeleton = () => {
  const styles = useStyles(makeStyles);

  return (
    <SkeletonPulse accessibilityLabel="Loading this pet">
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <SkeletonBlock width={AVATAR_SIZE} height={AVATAR_SIZE} radius={Radius.full} />
          <SkeletonBlock width={CARE_CARD_WIDTH} height={CARE_CARD_HEIGHT} radius={Radius.tile} />
        </View>

        <SkeletonBlock width={140} height={28} radius={Radius.tile} />
        <SkeletonBlock width={200} height={12} />
      </View>

      <View style={styles.strip}>
        <SkeletonBlock width={PHOTO_TILE} height={PHOTO_TILE} radius={Radius.tile} />
        <SkeletonBlock width={PHOTO_TILE} height={PHOTO_TILE} radius={Radius.tile} />
        <SkeletonBlock width={PHOTO_TILE} height={PHOTO_TILE} radius={Radius.tile} />
      </View>

      <View style={styles.section}>
        <ListCard style={styles.card}>
          {ROW_WIDTHS.map((width) => (
            <View key={width} style={styles.row}>
              <SkeletonBlock width={width} height={14} />
              <SkeletonBlock width={56} height={22} />
            </View>
          ))}
        </ListCard>
      </View>
    </SkeletonPulse>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    hero: {
      alignItems: 'center',
      gap: spacing.two,
      paddingTop: spacing.four,
      paddingHorizontal: ScreenGutter
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.two
    },
    strip: {
      flexDirection: 'row',
      gap: spacing.two,
      paddingTop: spacing.four,
      paddingLeft: ScreenGutter
    },
    section: {
      paddingTop: spacing.four,
      paddingHorizontal: ScreenGutter
    },
    card: { padding: spacing.three, gap: 22 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  });

export default PetDetailSkeleton;
