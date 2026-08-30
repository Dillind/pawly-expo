import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { formatAuthorName } from '@/utils/members';
import { useStyles } from '@/hooks/use-styles';
import { formatTimeOfDay } from '@/lib/dates';
import type { FeedLog } from '@/types/core';
import { StyleSheet, View } from 'react-native';

type Props = {
  log: FeedLog;
  /** Only passed when the household has several pets — otherwise it is noise. */
  petName?: string;
  timezone: string;
  onPress: () => void;
};

const FeedLogRow = ({ log, petName, timezone, onPress }: Props) => {
  const styles = useStyles(makeStyles);

  const authorName = formatAuthorName(log.author);
  const timeOfDay = formatTimeOfDay(log.loggedAt, timezone);

  return (
    <PressableOpacity
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Edit feed logged by ${authorName}${
        petName ? ` for ${petName}` : ''
      } at ${timeOfDay}`}>
      <Icon name="utensils" size={18} color="text" />
      <View style={styles.body}>
        <AppText size={16}>{petName ? `${authorName} fed ${petName}` : authorName}</AppText>
        {log.notes && (
          <AppText size={14} color="textSecondary" numberOfLines={2}>
            {log.notes}
          </AppText>
        )}
      </View>
      {/* Time and pencil are one trailing cluster at a tighter gap than the row's
          own: at the row gap the pencil reads as a fourth free-floating item
          rather than an affordance attached to this log. The pencil is
          decorative -- the row is the tap target, so tapping the pencil opens
          the sheet without a second 44pt target nested inside the first. */}
      <View style={styles.trailing}>
        <AppText size={14} color="textSecondary">
          {timeOfDay}
        </AppText>
        <Icon name="pencil" size={16} color="textSecondary" />
      </View>
    </PressableOpacity>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      padding: spacing.three,
      borderRadius: 12,
      marginBottom: spacing.two,
      backgroundColor: colors.backgroundElement
    },
    body: {
      flex: 1,
      gap: spacing.one
    },
    trailing: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    }
  });

export default FeedLogRow;
