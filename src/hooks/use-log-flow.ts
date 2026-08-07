import { useLogFeed } from '@/hooks/queries/use-feed-log-mutations';
import { formatTimeOfDay } from '@/lib/dates';
import { feedLogErrorMessage } from '@/lib/feed-log-errors';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import type { LogFeedResult } from '@/services/feed-log.service';
import type { FeedingScheduleLabel, HouseholdMember, Pet, SlotState } from '@/types/core';
import { memberDisplayName } from '@/utils/members';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

type DoubleFeed = Extract<LogFeedResult, { status: 'double_feed' }>;

/** A Double Feed is not here -- it is an alert. See AGENTS.md, Alerts. */
export type LogConfirm = { kind: 'late'; pet: Pet; slot: SlotState };

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
  const word = LABEL_WORD[warning.slot.label];
  const what = word ? `${pet.name}'s ${word}` : `a feed for ${pet.name}`;

  return `${who} logged ${what} at ${formatTimeOfDay(warning.existing.loggedAt, timezone)}.`;
}

type Options = {
  members: HouseholdMember[];
  timezone: string | undefined;
  /** A question has to be asked on its own step, so the host should raise the tray. */
  onConfirmNeeded: () => void;
  /** A feed was actually written. */
  onWritten: () => void;
};

/**
 * Owns everything between tapping a Scheduled Time and a row appearing.
 *
 * Lives above both hosts — the Home card renders the list inline, the tray
 * renders the same list as a step — so a pick made in either place reaches the
 * same question.
 */
export function useLogFlow({ members, timezone, onConfirmNeeded, onWritten }: Options) {
  const [confirm, setConfirm] = useState<LogConfirm | null>(null);
  // Bumped on every question asked. The tray navigates on this rather than on
  // `confirm` going non-null, so backing out and picking the same row again
  // still moves the step.
  const [confirmToken, setConfirmToken] = useState(0);

  const ask = useCallback((next: LogConfirm) => {
    setConfirm(next);
    setConfirmToken((token) => token + 1);
  }, []);

  const { mutate: logFeed, isPending: isLogging } = useLogFeed();

  const write = useCallback(
    function run(pet: Pet, loggedAt: string, successText: string, confirmed = false) {
      logFeed(
        { petId: pet.id, loggedAt, confirmed },
        {
          onSuccess: (result) => {
            if (result.status === 'double_feed') {
              setConfirm(null);
              Alert.alert(
                'Already logged',
                timezone ? alreadyLoggedText(pet, result, members, timezone) : undefined,
                [
                  { text: 'Cancel', style: 'cancel', isPreferred: true },
                  {
                    text: 'Log anyway',
                    onPress: () => run(pet, loggedAt, successText, true)
                  }
                ]
              );
              return;
            }

            setConfirm(null);
            showSuccessToast(successText);
            onWritten();
          },
          onError: (error) => {
            console.error(error);
            setConfirm(null);
            showErrorToast(feedLogErrorMessage(error));
          }
        }
      );
    },
    [logFeed, members, onWritten, timezone]
  );

  const pickSlot = useCallback(
    (pet: Pet, slot: SlotState) => {
      if (slot.state === 'due') {
        write(pet, new Date().toISOString(), loggedText(pet, slot.label));
        return;
      }

      ask({ kind: 'late', pet, slot });
      onConfirmNeeded();
    },
    [ask, onConfirmNeeded, write]
  );

  const resolveLate = useCallback(
    (when: 'now' | 'scheduled') => {
      if (!confirm) return;

      const { pet, slot } = confirm;

      if (when === 'now') {
        write(pet, new Date().toISOString(), 'Logged as an extra feed');
        return;
      }

      write(pet, slot.scheduledAt, loggedText(pet, slot.label));
    },
    [confirm, write]
  );

  const cancel = useCallback(() => setConfirm(null), []);

  return { confirm, confirmToken, isLogging, pickSlot, resolveLate, cancel };
}
