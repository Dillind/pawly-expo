import SlotRow from '@/components/ui/slot-row';
import type { HouseholdMember, SlotState } from '@/types/core';
import { memberDisplayName } from '@/utils/members';
import { View } from 'react-native';

type Props = {
  slots: SlotState[];
  timezone: string;
  members: HouseholdMember[];
  /** Inside a Home card rather than a tray step. */
  isNested?: boolean;
  onOpenLog: (logId: string) => void;
  onPickSlot: (slot: SlotState) => void;
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
  onPickSlot
}: Props) => {
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
    </View>
  );
};

export default ScheduledTimeList;
