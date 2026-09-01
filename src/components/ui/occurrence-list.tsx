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
  /**
   * Whether the day being shown is today. A past day is read-only: the log
   * tray writes against today, so a Log chip on Wednesday last week would
   * quietly record the feed against this morning.
   */
  isToday?: boolean;
  onOpenLog: (logId: string) => void;
  /** Omitted where the screen does not log. Without it no row draws a Log chip. */
  onPickOccurrence?: (occurrence: Occurrence) => void;
};

/**
 * Today's occurrences, as something to act on. Rendered inline by the Home card
 * and as a tray step, which is why it holds no presentation of its own.
 *
 * Logging is Home's job. Pet detail passes no `onPickOccurrence`, so its rows
 * show state and nothing to tap.
 *
 * An `upcoming` row has no Log button: its Feed Time is in the future, and RLS
 * rejects a `logged_at` later than now(). There is nothing a tap could write.
 *
 * Neither has any row on a day that is not today. A past feed is backfilled
 * through the late-feed flow, which asks who fed and when -- not by a chip that
 * would write the record against the wrong day.
 */
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
              onPickOccurrence &&
              isToday &&
              (occurrence.state === 'due' || occurrence.state === 'missed')
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
