import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import UserAvatar from '@/components/core/user-avatar';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatRelativeTime, formatTimeOfDay } from '@/lib/dates';
import type { FeedingScheduleLabel, FeedLog } from '@/types/core';
import { formatAuthorName } from '@/utils/members';
import { StyleSheet, View } from 'react-native';

const AVATAR_SIZE = 36;

const LABEL_WORD: Record<FeedingScheduleLabel, string> = {
  morning: 'morning feed',
  lunch: 'lunch feed',
  dinner: 'dinner feed',
  custom: 'feed'
};

type Props = {
  log: FeedLog;
  /** Only passed when the household has several pets — otherwise it is noise. */
  petName?: string;
  /** Which feed time this log satisfied, where it satisfied one. */
  label?: FeedingScheduleLabel;
  timezone: string;
  onPress: () => void;
};

/**
 * One logged feed. The avatar is the member's, because on this screen the
 * question is who did it — the pet is named in the line beside it.
 */
const FeedLogRow = ({ log, petName, label, timezone, onPress }: Props) => {
  const styles = useStyles(makeStyles);

  const authorName = formatAuthorName(log.author);
  const timeOfDay = formatTimeOfDay(log.loggedAt, timezone);
  const feedWord = LABEL_WORD[label ?? 'custom'];
  const title = petName ? `${petName}'s ${feedWord}` : capitalise(feedWord);

  return (
    <PressableOpacity
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${title}, logged by ${authorName} at ${timeOfDay}`}>
      <UserAvatar
        firstName={log.author?.firstName}
        lastName={log.author?.lastName}
        size={AVATAR_SIZE}
      />

      <View style={styles.body}>
        <AppText size={15} numberOfLines={1}>
          {title}
        </AppText>
        <AppText size={13} color="textSecondary" numberOfLines={1}>
          {log.notes ? `${authorName}, ${timeOfDay} · ${log.notes}` : `${authorName}, ${timeOfDay}`}
        </AppText>
      </View>

      <AppText size={13} color="textSecondary">
        {formatRelativeTime(log.loggedAt)}
      </AppText>
    </PressableOpacity>
  );
};

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: 14,
      paddingHorizontal: spacing.three
    },
    body: {
      flex: 1,
      gap: spacing.half
    }
  });

export default FeedLogRow;
