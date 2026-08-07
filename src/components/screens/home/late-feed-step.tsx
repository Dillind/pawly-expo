import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { LogConfirm } from '@/hooks/use-log-flow';
import { formatScheduledTime, formatTimeOfDay } from '@/lib/dates';
import type { FeedingScheduleLabel } from '@/types/core';
import { StyleSheet, View } from 'react-native';

type Props = {
  confirm: LogConfirm;
  timezone: string;
  isLogging: boolean;
  onResolveLate: (when: 'now' | 'scheduled') => void;
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
  isPrimary,
  isDisabled,
  onPress
}: {
  title: string;
  detail: string;
  isPrimary?: boolean;
  isDisabled: boolean;
  onPress: () => void;
}) => {
  const styles = useStyles(makeStyles);

  return (
    <PressableOpacity
      style={[styles.option, isPrimary ? styles.primary : styles.secondary]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      disabled={isDisabled}
      onPress={onPress}>
      <View style={styles.optionBody}>
        <AppText size={16} fontWeight="bold" color={isPrimary ? 'onPrimary' : 'text'}>
          {title}
        </AppText>
        <AppText size={13} color={isPrimary ? 'onPrimary' : 'textSecondary'} style={styles.detail}>
          {detail}
        </AppText>
      </View>

      <Icon name="caretRight" size={16} color={isPrimary ? 'onPrimary' : 'textSecondary'} />
    </PressableOpacity>
  );
};

/**
 * A choice, not a confirmation, which is why it is a step and not an alert:
 * each option needs a consequence written under it. See ADR 0016.
 */
const LateFeedStep = ({ confirm, timezone, isLogging, onResolveLate }: Props) => {
  const styles = useStyles(makeStyles);
  const { slot } = confirm;
  const nowLabel = formatTimeOfDay(new Date().toISOString(), timezone);

  return (
    <View style={styles.content}>
      <AppText size={14} color="textSecondary">
        {SLOT_WORD[slot.label]} was due at {formatScheduledTime(slot.scheduledTime)}. It is now{' '}
        {nowLabel}.
      </AppText>

      <Option
        title={`Just now, ${nowLabel}`}
        detail={`The household will be notified. ${SLOT_WORD[slot.label]} stays Not logged.`}
        isPrimary
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
      borderCurve: 'continuous'
    },
    primary: {
      backgroundColor: colors.primary
    },
    secondary: {
      backgroundColor: colors.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.backgroundSelected
    },
    optionBody: { flex: 1, gap: 2 },
    detail: { opacity: 0.85 }
  });

export default LateFeedStep;
