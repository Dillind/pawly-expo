import ListCard from '@/components/core/list-card';
import { SkeletonBlock, SkeletonPulse } from '@/components/core/skeleton';
import { Radius, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

const AVATAR_SIZE = 36;

// Two bands of different lengths, because that is what a day of feeds looks
// like. Equal bands read as a table waiting for data.
const BANDS = [
  { day: 64, rows: ['62%', '54%', '68%'] },
  { day: 120, rows: ['58%', '66%'] }
] as const;

/**
 * Activity while it loads. The day bands hold their place, so nothing on the
 * screen moves sideways when the real days arrive.
 */
const ActivitySkeleton = () => {
  const styles = useStyles(makeStyles);

  return (
    <SkeletonPulse accessibilityLabel="Loading activity">
      {BANDS.map((band, index) => (
        <View key={band.day}>
          <View style={[styles.band, index > 0 && styles.ruled]}>
            <SkeletonBlock width={band.day} height={11} />
          </View>

          <View style={styles.group}>
            <ListCard style={styles.card}>
              {band.rows.map((width) => (
                <View key={width} style={styles.row}>
                  <SkeletonBlock width={AVATAR_SIZE} height={AVATAR_SIZE} radius={Radius.full} />
                  <View style={styles.body}>
                    <SkeletonBlock width={width} height={13} />
                    <SkeletonBlock width="38%" height={11} />
                  </View>
                </View>
              ))}
            </ListCard>
          </View>
        </View>
      ))}
    </SkeletonPulse>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    band: {
      paddingVertical: spacing.two,
      paddingHorizontal: ScreenGutter,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border
    },
    ruled: {
      marginTop: spacing.four,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border
    },
    group: {
      paddingHorizontal: ScreenGutter,
      paddingTop: spacing.two
    },
    card: { padding: spacing.three, gap: spacing.four },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three
    },
    body: { flex: 1, gap: 7 }
  });

export default ActivitySkeleton;
