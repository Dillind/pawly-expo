import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import SlotRow from '@/components/ui/slot-row';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { HouseholdMember, SlotState } from '@/types/core';
import { memberDisplayName } from '@/utils/members';
import { StyleSheet, View } from 'react-native';

type Props = {
  slots: SlotState[];
  timezone: string;
  members: HouseholdMember[];
  /** Inside a Home card rather than a tray step. */
  isNested?: boolean;
  onOpenLog: (logId: string) => void;
  onPickSlot: (slot: SlotState) => void;
  onPickExtra: () => void;
};

/**
 * Today's Scheduled Times, as something to choose from. Rendered inline by the
 * Home card and as a tray step, which is why it holds no presentation of its
 * own.
 *
 * An `upcoming` row stays inert: its Scheduled Time is in the future, and RLS
 * rejects a `logged_at` later than now(). There is nothing a tap could write.
 */
const ScheduledTimeList = ({
  slots,
  timezone,
  members,
  isNested = false,
  onOpenLog,
  onPickSlot,
  onPickExtra
}: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View>
      {slots.map((slot) => {
        const onPress =
          slot.state === 'fed' && slot.satisfyingLogId
            ? () => onOpenLog(slot.satisfyingLogId as string)
            : slot.state === 'due' || slot.state === 'missed'
              ? () => onPickSlot(slot)
              : undefined;

        return (
          <SlotRow
            key={slot.scheduleId}
            slot={slot}
            timezone={timezone}
            fedBy={memberDisplayName(members, slot.satisfiedBy)}
            isNested={isNested}
            onPress={onPress}
          />
        );
      })}

      <View style={styles.divider} />

      <PressableOpacity
        style={[styles.extra, isNested && styles.extraNested]}
        accessibilityRole="button"
        accessibilityLabel="Log a feed that is not a scheduled time"
        onPress={onPickExtra}>
        <Icon name="plus" size={18} color="textSecondary" />
        <AppText size={16} style={styles.extraLabel}>
          Something else
        </AppText>
        <Icon name="caretRight" size={16} color="textSecondary" />
      </PressableOpacity>
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    divider: {
      height: StyleSheet.hairlineWidth,
      marginVertical: spacing.one,
      backgroundColor: colors.backgroundSelected
    },
    extra: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.three,
      paddingHorizontal: spacing.three,
      borderRadius: 12,
      backgroundColor: colors.backgroundElement
    },
    extraNested: {
      paddingHorizontal: 0,
      paddingVertical: spacing.two,
      borderRadius: 0,
      backgroundColor: 'transparent'
    },
    extraLabel: { flex: 1 }
  });

export default ScheduledTimeList;
