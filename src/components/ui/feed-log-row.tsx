import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { formatAuthorName } from '@/hooks/use-household-members';
import { useStyles } from '@/hooks/use-styles';
import { formatTimeOfDay } from '@/lib/dates';
import type { FeedLog } from '@/types/core';
import { StyleSheet, View } from 'react-native';

type Props = {
  log: FeedLog;
  timezone: string;
  onPress: () => void;
};

const FeedLogRow = ({ log, timezone, onPress }: Props) => {
  const styles = useStyles(makeStyles);

  const authorName = formatAuthorName(log.author);

  return (
    <PressableOpacity style={styles.row} onPress={onPress}>
      <Icon name="utensils" size={18} color="primary" />
      <View style={styles.body}>
        <AppText size={16}>{authorName}</AppText>
        {log.notes && (
          <AppText size={14} color="textSecondary" numberOfLines={2}>
            {log.notes}
          </AppText>
        )}
      </View>
      <AppText size={14} color="textSecondary">
        {formatTimeOfDay(log.loggedAt, timezone)}
      </AppText>
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
    }
  });

export default FeedLogRow;
