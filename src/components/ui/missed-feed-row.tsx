import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatScheduledTime } from '@/lib/dates';
import type { FeedingScheduleLabel, Occurrence } from '@/types/core';
import { StyleSheet, View } from 'react-native';

const RING_SIZE = 36;

const LABEL_WORD: Record<FeedingScheduleLabel, string> = {
  morning: 'morning feed',
  lunch: 'lunch feed',
  dinner: 'dinner feed',
  custom: 'feed'
};

type Props = {
  occurrence: Occurrence;
  /** Only passed when the household has several pets — otherwise it is noise. */
  petName?: string;
};

/**
 * A feed nobody logged, in the household's history.
 *
 * It recesses rather than alarms: a sunk fill, a hollow dashed ring where a
 * member's avatar would be, and secondary ink throughout. Never gold and never
 * red -- gold means "act now", and a missed feed in the past cannot be acted
 * on from here.
 *
 * The label is always "Not logged". The app knows whether anyone tapped Log; it
 * does not know whether the pet ate. CONTEXT.md, Not Logged.
 */
const MissedFeedRow = ({ occurrence, petName }: Props) => {
  const styles = useStyles(makeStyles);

  const feedWord = LABEL_WORD[occurrence.label];
  const title = petName ? `${petName}'s ${feedWord}` : capitalise(feedWord);

  return (
    <View style={styles.row} accessibilityLabel={`${title}, not logged`}>
      <View style={styles.ring}>
        <Icon name="dot" size={18} color="textSecondary" />
      </View>

      <View style={styles.body}>
        <AppText size={15} color="textSecondary" numberOfLines={1}>
          {title}
        </AppText>
        <AppText size={13} color="textSecondary">
          Not logged
        </AppText>
      </View>

      <AppText size={13} color="textSecondary">
        {formatScheduledTime(occurrence.localTime)}
      </AppText>
    </View>
  );
};

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: 14,
      paddingHorizontal: spacing.three,
      backgroundColor: colors.backgroundSelected
    },
    ring: {
      width: RING_SIZE,
      height: RING_SIZE,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.ghostBorder,
      alignItems: 'center',
      justifyContent: 'center'
    },
    body: {
      flex: 1,
      gap: spacing.half
    }
  });

export default MissedFeedRow;
