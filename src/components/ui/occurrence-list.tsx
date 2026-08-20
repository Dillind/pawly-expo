import OccurrenceRow from '@/components/ui/occurrence-row';
import type { HouseholdMember, Occurrence } from '@/types/core';
import { memberDisplayName } from '@/utils/members';
import { View } from 'react-native';

type Props = {
  occurrences: Occurrence[];
  timezone: string;
  members: HouseholdMember[];
  /** Inside a Home card rather than a tray step. */
  isNested?: boolean;
  onOpenLog: (logId: string) => void;
  onPickOccurrence: (occurrence: Occurrence) => void;
};

/**
 * Today's occurrences, as something to choose from. Rendered inline by the Home
 * card and as a tray step, which is why it holds no presentation of its own.
 *
 * An `upcoming` row stays inert: its Feed Time is in the future, and RLS
 * rejects a `logged_at` later than now(). There is nothing a tap could write.
 */
const OccurrenceList = ({
  occurrences,
  timezone,
  members,
  isNested = false,
  onOpenLog,
  onPickOccurrence
}: Props) => {
  return (
    <View>
      {occurrences.map((occurrence) => {
        const onPress =
          occurrence.state === 'fed' && occurrence.satisfyingLogId
            ? () => onOpenLog(occurrence.satisfyingLogId as string)
            : occurrence.state === 'due' || occurrence.state === 'missed'
              ? () => onPickOccurrence(occurrence)
              : undefined;

        return (
          <OccurrenceRow
            key={occurrence.seriesId}
            occurrence={occurrence}
            timezone={timezone}
            fedBy={memberDisplayName(members, occurrence.satisfiedBy)}
            isNested={isNested}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
};

export default OccurrenceList;
