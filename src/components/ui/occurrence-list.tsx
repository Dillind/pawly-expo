import { Fragment } from 'react';
import { View } from 'react-native';

import Divider from '@/components/core/divider';
import OccurrenceRow from '@/components/ui/occurrence-row';
import type { HouseholdMember, Occurrence } from '@/types/core';
import { memberDisplayName } from '@/utils/members';

type Props = {
  occurrences: Occurrence[];
  timezone: string;
  members: HouseholdMember[];
  isNested?: boolean;
  hasDividers?: boolean;
  // A past day is read-only: the tray writes against today, so a Log chip on
  // last Wednesday would record the feed against this morning.
  isToday?: boolean;
  onOpenLog: (logId: string) => void;
  // Omitted where the screen does not log. Without it no row draws a chip.
  onPickOccurrence?: (occurrence: Occurrence) => void;
};

// An `upcoming` row has no Log button: RLS rejects a `logged_at` later than
// now(), so there is nothing a tap could write.
const OccurrenceList = ({
  occurrences,
  timezone,
  members,
  isNested = false,
  hasDividers = false,
  isToday = true,
  onOpenLog,
  onPickOccurrence
}: Props) => {
  return (
    <View>
      {occurrences.map((occurrence, index) => (
        <Fragment key={occurrence.seriesId}>
          {hasDividers && index > 0 && <Divider />}
          <OccurrenceRow
            occurrence={occurrence}
            timezone={timezone}
            fedBy={memberDisplayName(members, occurrence.satisfiedBy)}
            isNested={isNested}
            onOpenLog={
              occurrence.satisfyingLogId
                ? () => onOpenLog(occurrence.satisfyingLogId as string)
                : undefined
            }
            onLog={
              onPickOccurrence && isToday && occurrence.state !== 'fed'
                ? () => onPickOccurrence(occurrence)
                : undefined
            }
          />
        </Fragment>
      ))}
    </View>
  );
};

export default OccurrenceList;
