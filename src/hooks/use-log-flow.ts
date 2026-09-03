import { useCallback } from 'react';
import { Alert } from 'react-native';

import { useLogFeed } from '@/hooks/queries/feeding/use-feed-log-mutations';
import { formatTimeOfDay } from '@/lib/dates';
import { feedLogErrorMessage } from '@/lib/feed-log-errors';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import type { LogFeedResult } from '@/services/feed-log.service';
import type { FeedingScheduleLabel, HouseholdMember, Occurrence, Pet } from '@/types/core';
import { memberDisplayName } from '@/utils/members';

type DoubleFeed = Extract<LogFeedResult, { status: 'double_feed' }>;

/** `custom` has no word a sentence can use, so those feeds stay unnamed. */
const LABEL_WORD: Record<FeedingScheduleLabel, string | null> = {
  morning: 'morning',
  lunch: 'lunch',
  dinner: 'dinner',
  custom: null
};

function loggedText(pet: Pet, label: FeedingScheduleLabel): string {
  const word = LABEL_WORD[label];

  return word ? `Logged ${pet.name}'s ${word}` : `Logged a feed for ${pet.name}`;
}

function alreadyLoggedText(
  pet: Pet,
  warning: DoubleFeed,
  members: HouseholdMember[],
  timezone: string
): string {
  const who = memberDisplayName(members, warning.existing.loggedBy);
  const word = LABEL_WORD[warning.occurrence.label];
  const what = word ? `${pet.name}'s ${word}` : `a feed for ${pet.name}`;

  return `${who} logged ${what} at ${formatTimeOfDay(warning.existing.loggedAt, timezone)}.`;
}

type Options = {
  members: HouseholdMember[];
  timezone: string | undefined;
  /** A feed was actually written. */
  onWritten: () => void;
};

/**
 * Owns everything between tapping a Feed Time and a row appearing.
 *
 * Lives above both hosts — the Home card renders the list inline, the tray
 * renders the same list as a step — so a pick made in either place behaves the
 * same way.
 *
 * There is no late-feed question. A log names the feed it satisfies, so a feed
 * logged at 19:52 is dinner logged late, and nothing has to be asked (ADR 0029).
 */
export function useLogFlow({ members, timezone, onWritten }: Options) {
  const { mutate: logFeed, isPending: isLogging } = useLogFeed();

  const write = useCallback(
    function run(
      pet: Pet,
      input: {
        loggedAt: string;
        notes?: string | null;
        seriesId?: string | null;
        occurrenceDate?: string | null;
      },
      successText: string,
      confirmed = false
    ) {
      logFeed(
        { petId: pet.id, ...input, confirmed },
        {
          onSuccess: (result) => {
            if (result.status === 'double_feed') {
              Alert.alert(
                'Already logged',
                timezone ? alreadyLoggedText(pet, result, members, timezone) : undefined,
                [
                  { text: 'Cancel', style: 'cancel', isPreferred: true },
                  {
                    text: 'Log anyway',
                    onPress: () => run(pet, input, 'Logged as an extra feed', true)
                  }
                ]
              );
              return;
            }

            showSuccessToast(result.isExtraFeed ? 'Logged as an extra feed' : successText);
            onWritten();
          },
          onError: (error) => {
            console.error(error);
            showErrorToast(feedLogErrorMessage(error));
          }
        }
      );
    },
    [logFeed, members, onWritten, timezone]
  );

  const pickOccurrence = useCallback(
    (pet: Pet, occurrence: Occurrence) => {
      write(
        pet,
        {
          loggedAt: new Date().toISOString(),
          seriesId: occurrence.seriesId,
          occurrenceDate: occurrence.occurrenceDate
        },
        loggedText(pet, occurrence.label)
      );
    },
    [write]
  );

  /**
   * The tray's write: one or more pets, one feed, one time. A null occurrence
   * is an Extra Feed — "Not on the schedule" — which satisfies nothing.
   *
   * `matches` names each pet's OWN occurrence for the chosen feed. Writing the
   * others as Extra Feeds instead would leave their occurrences unsatisfied,
   * and the sweep would then nudge the household about a pet fed a minute ago.
   */
  const log = useCallback(
    (
      pets: Pet[],
      occurrence: Occurrence | null,
      input: { loggedAt: string; notes: string | null },
      matches: Record<string, Occurrence | undefined> = {}
    ) => {
      pets.forEach((pet) => {
        const mine = occurrence ? matches[pet.id] : undefined;

        write(
          pet,
          {
            ...input,
            seriesId: mine?.seriesId ?? null,
            occurrenceDate: mine?.occurrenceDate ?? null
          },
          mine ? loggedText(pet, mine.label) : `Logged a feed for ${pet.name}`
        );
      });
    },
    [write]
  );

  return { isLogging, pickOccurrence, log };
}
