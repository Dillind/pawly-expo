import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { LogConfirm } from '@/hooks/use-log-flow';
import { formatScheduledTime, formatTimeOfDay } from '@/lib/dates';
import type { FeedingScheduleLabel, HouseholdMember } from '@/types/core';
import { memberDisplayName } from '@/utils/members';
import { StyleSheet, View } from 'react-native';

type Props = {
  confirm: LogConfirm;
  timezone: string;
  members: HouseholdMember[];
  isLogging: boolean;
  onResolveLate: (when: 'now' | 'scheduled') => void;
  onResolveDouble: () => void;
  onCancel: () => void;
};

const SLOT_WORD: Record<FeedingScheduleLabel, string> = {
  morning: 'Morning',
  lunch: 'Lunch',
  dinner: 'Dinner',
  custom: 'This feed'
};

const Option = ({
  title,
  detail,
  isDisabled,
  onPress
}: {
  title: string;
  detail: string;
  isDisabled: boolean;
  onPress: () => void;
}) => {
  const styles = useStyles(makeStyles);

  return (
    <PressableOpacity
      style={styles.option}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      disabled={isDisabled}
      onPress={onPress}>
      <View style={styles.optionBody}>
        <AppText size={16} fontWeight="bold">
          {title}
        </AppText>
        <AppText size={13} color="textSecondary">
          {detail}
        </AppText>
      </View>

      <Icon name="caretRight" size={16} color="textSecondary" />
    </PressableOpacity>
  );
};

/**
 * The one place the app asks a question before writing a feed.
 *
 * Two shapes, both a question about a timestamp:
 *
 * - `late`  — the Grace Window has closed, so satisfying the Scheduled Time
 *   means recording a time the user did not choose. Offering both is what
 *   stops the app putting words in their mouth: recording the scheduled time
 *   clears the row but suppresses the alert (ADR 0012), and recording now
 *   notifies the household but leaves the row Not Logged.
 * - `double` — the feed collides with one already logged. Nothing has been
 *   written yet.
 */
const LogConfirmStep = ({
  confirm,
  timezone,
  members,
  isLogging,
  onResolveLate,
  onResolveDouble,
  onCancel
}: Props) => {
  const styles = useStyles(makeStyles);

  if (confirm.kind === 'late') {
    const { slot } = confirm;

    return (
      <View style={styles.content}>
        <AppText size={14} color="textSecondary">
          {SLOT_WORD[slot.label]} was due at {formatScheduledTime(slot.scheduledTime)}. It is now{' '}
          {formatTimeOfDay(new Date().toISOString(), timezone)}.
        </AppText>

        <Option
          title={`Just now, ${formatTimeOfDay(new Date().toISOString(), timezone)}`}
          detail={`The household will be notified. ${SLOT_WORD[slot.label]} stays Not logged.`}
          isDisabled={isLogging}
          onPress={() => onResolveLate('now')}
        />

        <Option
          title={`At the scheduled ${formatScheduledTime(slot.scheduledTime)}`}
          detail={`Clears ${SLOT_WORD[slot.label].toLowerCase()}. Nobody will be notified.`}
          isDisabled={isLogging}
          onPress={() => onResolveLate('scheduled')}
        />
      </View>
    );
  }

  const { warning } = confirm;

  return (
    <View style={styles.content}>
      <View style={styles.warning}>
        <Icon name="circleAlert" size={18} color="accent" />
        <AppText size={14} style={styles.warningBody}>
          {memberDisplayName(members, warning.existing.loggedBy)} already logged the{' '}
          {SLOT_WORD[warning.slot.label].toLowerCase()} feed at{' '}
          {formatScheduledTime(warning.slot.scheduledTime)}, at{' '}
          {formatTimeOfDay(warning.existing.loggedAt, timezone)}.
        </AppText>
      </View>

      <AppText size={13} color="textSecondary">
        Nothing has been written yet.
      </AppText>

      <MainButton text="Log anyway" isLoading={isLogging} onPress={onResolveDouble} />
      <MainButton text="Cancel" variant="secondary" isDisabled={isLogging} onPress={onCancel} />
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: { gap: spacing.three },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      padding: spacing.three,
      borderRadius: 12,
      backgroundColor: colors.backgroundElement
    },
    optionBody: { flex: 1, gap: 2 },
    warning: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.two,
      padding: spacing.three,
      borderRadius: 12,
      backgroundColor: colors.backgroundElement
    },
    warningBody: { flex: 1 }
  });

export default LogConfirmStep;
