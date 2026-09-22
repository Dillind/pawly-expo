import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { IconSize, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatTimeOfDay } from '@/lib/dates';
import type { FeedLog, HouseholdMember } from '@/types/core';
import { memberDisplayName } from '@/utils/members';

type Props = {
  logs: FeedLog[];
  timezone: string;
  members: HouseholdMember[];
  onOpenLog: (logId: string) => void;
};

const AdditionalLogs = ({ logs, timezone, members, onOpenLog }: Props) => {
  const styles = useStyles(makeStyles);

  if (!logs.length) return null;

  return (
    <View style={styles.section}>
      <AppText size="footnote" color="textSecondary" fontWeight="bold">
        Additional logs
      </AppText>
      {logs.map((log) => (
        <PressableOpacity
          key={log.id}
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel={`Edit the ${formatTimeOfDay(log.loggedAt, timezone)} log`}
          onPress={() => onOpenLog(log.id)}>
          <View style={styles.text}>
            <View style={styles.heading}>
              <AppText size="callout">Feed</AppText>
              <AppText size="callout" color="textSecondary">
                {formatTimeOfDay(log.loggedAt, timezone)}
              </AppText>
            </View>
            <AppText size="footnote" color="textSecondary" numberOfLines={2}>
              {memberDisplayName(members, log.loggedBy)}
            </AppText>
          </View>
          <Icon name="check" size={IconSize.action} color="success" />
        </PressableOpacity>
      ))}
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    section: {
      paddingTop: spacing.two
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.two
    },
    text: {
      flex: 1,
      gap: 2
    },
    heading: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.two
    }
  });

export default AdditionalLogs;
