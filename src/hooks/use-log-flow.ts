import { useLogFeed } from '@/hooks/queries/use-feed-log-mutations';
import { feedLogErrorMessage } from '@/lib/feed-log-errors';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import type { LogFeedResult } from '@/services/feed-log.service';
import type { FeedingScheduleLabel, Pet, SlotState } from '@/types/core';
import { useCallback, useState } from 'react';

type DoubleFeed = Extract<LogFeedResult, { status: 'double_feed' }>;

export type LogConfirm =
  | { kind: 'late'; pet: Pet; slot: SlotState }
  | { kind: 'double'; pet: Pet; loggedAt: string; successText: string; warning: DoubleFeed };

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

function countsAsText(pet: Pet, label: FeedingScheduleLabel): string {
  const word = LABEL_WORD[label];

  return word
    ? `Logged — this counts as ${pet.name}'s ${word}`
    : `Logged — this counts as a scheduled feed`;
}

type Options = {
  /** A question has to be asked, so the host should raise the tray. */
  onConfirmNeeded: () => void;
  /** A feed was actually written. */
  onWritten: () => void;
};

/**
 * Owns everything between tapping a Scheduled Time and a row appearing.
 *
 * Lives above both hosts — the Home card renders the list inline, the tray
 * renders the same list as a step — so a pick made in either place can raise
 * the same confirm step.
 */
export function useLogFlow({ onConfirmNeeded, onWritten }: Options) {
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
    (pet: Pet, loggedAt: string, successText: string, confirmed = false) => {
      logFeed(
        { petId: pet.id, loggedAt, confirmed },
        {
          onSuccess: (result) => {
            if (result.status === 'double_feed') {
              // Nothing was written. Re-issued with confirmed: true if the
              // user says to.
              ask({ kind: 'double', pet, loggedAt, successText, warning: result });
              onConfirmNeeded();
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
    [ask, logFeed, onConfirmNeeded, onWritten]
  );

  const pickSlot = useCallback(
    (pet: Pet, slot: SlotState) => {
      // Inside the Grace Window, so `now` and the Scheduled Time mean the same
      // thing and there is nothing to ask.
      if (slot.state === 'due') {
        write(pet, new Date().toISOString(), loggedText(pet, slot.label));
        return;
      }

      ask({ kind: 'late', pet, slot });
      onConfirmNeeded();
    },
    [ask, onConfirmNeeded, write]
  );

  const pickExtra = useCallback(
    (pet: Pet, slots: SlotState[]) => {
      // Whatever the matcher will claim this log for. `due` is the server's own
      // answer to "is now inside this window", so nothing is recomputed here.
      const claimed = slots.find((slot) => slot.state === 'due');

      write(
        pet,
        new Date().toISOString(),
        claimed ? countsAsText(pet, claimed.label) : 'Logged as an extra feed'
      );
    },
    [write]
  );

  const resolveLate = useCallback(
    (when: 'now' | 'scheduled') => {
      if (confirm?.kind !== 'late') return;

      const { pet, slot } = confirm;

      if (when === 'now') {
        write(pet, new Date().toISOString(), 'Logged as an extra feed');
        return;
      }

      write(pet, slot.scheduledAt, loggedText(pet, slot.label));
    },
    [confirm, write]
  );

  const resolveDouble = useCallback(() => {
    if (confirm?.kind !== 'double') return;

    write(confirm.pet, confirm.loggedAt, confirm.successText, true);
  }, [confirm, write]);

  const cancel = useCallback(() => setConfirm(null), []);

  return {
    confirm,
    confirmToken,
    isLogging,
    pickSlot,
    pickExtra,
    resolveLate,
    resolveDouble,
    cancel
  };
}
