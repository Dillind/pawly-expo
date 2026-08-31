import Divider from '@/components/core/divider';
import OccurrenceRow from '@/components/ui/occurrence-row';
import type { HouseholdMember, Occurrence } from '@/types/core';
import { memberDisplayName } from '@/utils/members';
import { Fragment } from 'react';
import { View } from 'react-native';

type Props = {
  occurrences: Occurrence[];
  timezone: string;
  members: HouseholdMember[];
  /** Inside a Home card rather than a tray step. */
  isNested?: boolean;
  /** A rule between rows, for a list drawn as a card of its own. */
  hasDividers?: boolean;
  onOpenLog: (logId: string) => void;
  onPickOccurrence: (occurrence: Occurrence) => void;
};

/**
 * Today's occurrences, as something to act on. Rendered inline by the Home card
 * and as a tray step, which is why it holds no presentation of its own.
 *
 * An `upcoming` row has no Log button: its Feed Time is in the future, and RLS
 * rejects a `logged_at` later than now(). There is nothing a tap could write.
 */
const OccurrenceList = ({
  occurrences,
  timezone,
  members,
  isNested = false,
  hasDividers = false,
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
              occurrence.state === 'due' || occurrence.state === 'missed'
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
