import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { IconSize, Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { describePackedAge, isPackedStale } from '@/lib/travel-packing';
import type { TravelChecklist } from '@/services/travel-checklist.service';

const EMOJI_WELL = 44;
const BADGE = 18;

export const describeCount = (
  {
    itemCount,
    tickedCount,
    packedAt
  }: Pick<TravelChecklist, 'itemCount' | 'tickedCount' | 'packedAt'>,
  now: Date = new Date()
) => {
  if (packedAt) return `All packed, ${describePackedAge(packedAt, now)}`;
  if (tickedCount > 0) return `${tickedCount} of ${itemCount} packed`;
  if (itemCount === 1) return '1 item';
  return `${itemCount} items`;
};

const ChecklistRow = ({ checklist }: { checklist: TravelChecklist }) => {
  const styles = useStyles(makeStyles);
  const detail = describeCount(checklist);
  const isFreshlyPacked = Boolean(checklist.packedAt) && !isPackedStale(checklist.packedAt ?? '');

  return (
    <Link href={`/home/travel/${checklist.id}`} asChild>
      <PressableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${checklist.name}, ${detail}`}>
        <View style={styles.row}>
          <View style={styles.wellFrame}>
            <View style={styles.well}>
              {checklist.emoji ? (
                <AppText size={22}>{checklist.emoji}</AppText>
              ) : (
                <Icon name="luggage" size={IconSize.action} color="textSecondary" />
              )}
            </View>
            {checklist.packedAt && (
              <View style={styles.badge}>
                <Icon name="check" size={10} color="onSuccess" strokeWidth={3} />
              </View>
            )}
          </View>

          <View style={styles.text}>
            <AppText variant="header" size={17} numberOfLines={1}>
              {checklist.name}
            </AppText>
            <AppText
              size={13}
              color={isFreshlyPacked ? 'success' : 'textSecondary'}
              fontWeight={isFreshlyPacked ? 'semibold' : undefined}>
              {detail}
            </AppText>
          </View>

          <Icon name="caretRight" size={IconSize.control} color="textSecondary" />
        </View>
      </PressableOpacity>
    </Link>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.three,
      paddingHorizontal: spacing.three
    },
    wellFrame: {
      width: EMOJI_WELL,
      height: EMOJI_WELL
    },
    badge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: BADGE,
      height: BADGE,
      borderRadius: Radius.full,
      borderWidth: 2,
      borderColor: colors.backgroundElement,
      backgroundColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center'
    },
    well: {
      width: EMOJI_WELL,
      height: EMOJI_WELL,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundSelected
    },
    text: {
      flex: 1,
      gap: spacing.half
    }
  });

export default ChecklistRow;
