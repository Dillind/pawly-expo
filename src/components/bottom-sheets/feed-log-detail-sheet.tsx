import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import {
  FEED_LOG_NOTES_MAX_LENGTH,
  feedLogNotesOnlySchema,
  feedLogSchema,
  type FeedLogFormValues,
  type FeedLogNotesOnlyFormValues
} from '@/constants/schemas/feed-log';
import type { AppTheme } from '@/constants/theme';
import { useFeedLog } from '@/hooks/use-feed-log';
import { useDeleteFeedLog, useUpdateFeedLog } from '@/hooks/use-feed-log-mutations';
import { useHousehold } from '@/hooks/use-household';
import { formatAuthorName } from '@/hooks/use-household-members';
import { useStyles } from '@/hooks/use-styles';
import {
  composeLoggedAt,
  dayInTimezone,
  dayjs,
  formatDayHeading,
  formatTimeOfDay,
  timeInTimezone,
  todayInTimezone,
  yesterdayInTimezone
} from '@/lib/dates';
import { feedLogErrorMessage } from '@/lib/feed-log-errors';
import { useAuthStore } from '@/stores/auth-store';
import type { FeedLog } from '@/types/core';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useMemo, type RefObject } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  logId: string | undefined;
  petId: string | undefined;
};

/**
 * Only the fields the sub-forms below actually decided to change. Never
 * built by re-stating the field's current value -- see use-feed-log-
 * mutations.ts, whose update payload writes exactly (and only) the keys
 * present here.
 */
type SavePatch = { loggedAt?: string; notes?: string | null };

const dayOptions = ['today', 'yesterday'] as const;

const FeedLogDetailSheet = ({ sheetRef, logId, petId }: Props) => {
  const styles = useStyles(makeStyles);
  const { userId } = useAuthStore();
  const { data: household } = useHousehold();
  const { data: log, isLoading } = useFeedLog(logId);
  const updateFeedLog = useUpdateFeedLog(petId);
  const deleteFeedLog = useDeleteFeedLog(petId);

  const timezone = household?.timezone;

  // Presentation only -- RLS is the actual gate; this exists so a control is
  // never offered only to be rejected by the database. The window is
  // measured from created_at, not logged_at, so a backdated log is not born
  // uneditable (design doc, "Contributor edit window").
  const canEdit = Boolean(
    log &&
    (household?.isOwner ||
      (log.loggedBy === userId && dayjs().diff(dayjs(log.createdAt), 'hour') < 24))
  );

  // The Today/Yesterday control can only ever express these two calendar
  // days, but Owners may backdate a log arbitrarily far (RLS lifted their
  // floor). A log outside today/yesterday gets its date shown read-only
  // instead of being force-fit into a control that cannot represent it --
  // the simpler of the two options in the task-8 resolution, chosen because
  // it needs no partial-lock UI state and cannot ever let the day toggle
  // silently default to the wrong day for an old log.
  const isRecent = Boolean(
    log &&
    timezone &&
    (dayInTimezone(log.loggedAt, timezone) === todayInTimezone(timezone) ||
      dayInTimezone(log.loggedAt, timezone) === yesterdayInTimezone(timezone))
  );

  const authorName = formatAuthorName(log?.author);

  const onSave = (patch: SavePatch) => {
    if (!log) return;

    updateFeedLog.mutate(
      { logId: log.id, ...patch },
      {
        onSuccess: () => {
          toast.success('Feed updated');
          void sheetRef.current?.dismiss();
        },
        onError: (error) => {
          toast.error(feedLogErrorMessage(error));
        }
      }
    );
  };

  const onDelete = () => {
    if (!log) return;

    deleteFeedLog.mutate(
      { logId: log.id },
      {
        onSuccess: () => {
          toast.success('Feed deleted');
          void sheetRef.current?.dismiss();
        },
        onError: (error) => {
          toast.error(feedLogErrorMessage(error));
        }
      }
    );
  };

  return (
    <BaseSheet sheetRef={sheetRef} detents={['auto']} title="Feed log">
      {isLoading || !log || !timezone ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.content}>
          <AppText size={14} color="textSecondary">
            {authorName} · {formatDayHeading(dayInTimezone(log.loggedAt, timezone), timezone)} ·{' '}
            {formatTimeOfDay(log.loggedAt, timezone)}
          </AppText>

          {!canEdit ? (
            <AppText size={16}>{log.notes ?? 'No notes on this feed.'}</AppText>
          ) : (
            <>
              {isRecent ? (
                <EditableLogForm
                  key={log.id}
                  log={log}
                  timezone={timezone}
                  isOwner={household?.isOwner ?? false}
                  isSaving={updateFeedLog.isPending}
                  onSave={onSave}
                />
              ) : (
                <NotesOnlyForm
                  key={log.id}
                  log={log}
                  isSaving={updateFeedLog.isPending}
                  onSave={onSave}
                />
              )}

              <MainButton
                text="Delete this log"
                variant="secondary"
                isLoading={deleteFeedLog.isPending}
                isDisabled={updateFeedLog.isPending || deleteFeedLog.isPending}
                onPress={onDelete}
              />
            </>
          )}
        </View>
      )}
    </BaseSheet>
  );
};

type EditableLogFormProps = {
  log: FeedLog;
  timezone: string;
  isOwner: boolean;
  isSaving: boolean;
  onSave: (patch: SavePatch) => void;
};

/** The day/time/notes correction form, for a log made today or yesterday. */
function EditableLogForm({ log, timezone, isOwner, isSaving, onSave }: EditableLogFormProps) {
  const styles = useStyles(makeStyles);

  // Role-dependent, so it cannot be the static export the brief originally
  // sketched -- see feed-log.ts. Memoised on [isOwner, timezone] only; the
  // superRefine inside reads "now" itself at validation time, so this does
  // not go stale between renders.
  const schema = useMemo(() => feedLogSchema({ isOwner, timezone }), [isOwner, timezone]);

  const form = useForm<FeedLogFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      day:
        dayInTimezone(log.loggedAt, timezone) === todayInTimezone(timezone) ? 'today' : 'yesterday',
      time: timeInTimezone(log.loggedAt, timezone),
      notes: log.notes ?? ''
    },
    mode: 'onBlur'
  });

  const { control, handleSubmit, formState } = form;

  // Destructured during render on purpose. formState is a Proxy that only
  // subscribes to the keys read while rendering, so reading dirtyFields
  // solely inside the submit callback leaves it permanently empty. With
  // mode: 'onBlur' a text field masked this by forcing a formState update on
  // blur; the time spinner never blurs, so every save silently did nothing.
  const { dirtyFields } = formState;

  const onSubmit = handleSubmit((values) => {
    // The single most important rule in this sheet: never send a field the
    // user did not actually touch. dirtyFields is react-hook-form's own
    // record of what changed relative to defaultValues -- not a
    // re-derivation of it -- so a notes-only edit produces a patch with no
    // loggedAt key at all, and use-feed-log-mutations.ts writes only what's
    // present.
    const patch: SavePatch = {};

    if (dirtyFields.day || dirtyFields.time) {
      patch.loggedAt = composeLoggedAt(values.day, values.time, timezone);
    }

    if (dirtyFields.notes) {
      patch.notes = values.notes.trim().length > 0 ? values.notes.trim() : null;
    }

    if (patch.loggedAt === undefined && patch.notes === undefined) return;

    onSave(patch);
  });

  return (
    <FormProvider {...form}>
      <View style={styles.form}>
        <Controller
          control={control}
          name="day"
          render={({ field: { onChange, value } }) => (
            <View style={styles.dayRow}>
              {dayOptions.map((option) => (
                <PressableOpacity
                  key={option}
                  style={[styles.dayChip, value === option && styles.dayChipSelected]}
                  onPress={() => onChange(option)}>
                  <AppText size={14} color={value === option ? 'text' : 'textSecondary'}>
                    {option === 'today' ? 'Today' : 'Yesterday'}
                  </AppText>
                </PressableOpacity>
              ))}
            </View>
          )}
        />

        <Controller
          control={control}
          name="time"
          render={({ field: { onChange, value } }) => (
            <DateTimePickerValidated
              name="time"
              label="Time fed"
              mode="time"
              selectedDate={value}
              setSelectedDate={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInputValidated
              name="notes"
              label="Notes"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Half a scoop, plus her tablet"
              maxLength={FEED_LOG_NOTES_MAX_LENGTH}
              height={80}
              isMultiline
              showCharacterCount
            />
          )}
        />

        <MainButton
          text="Save changes"
          isLoading={isSaving}
          isDisabled={isSaving}
          onPress={() => {
            void onSubmit();
          }}
        />
      </View>
    </FormProvider>
  );
}

type NotesOnlyFormProps = {
  log: FeedLog;
  isSaving: boolean;
  onSave: (patch: SavePatch) => void;
};

/**
 * A log older than yesterday: the Today/Yesterday control cannot represent
 * its date without risking a silent day-shift, so it is not rendered at all
 * -- the sheet's header line above already shows that date, read-only, via
 * formatDayHeading. Only notes are editable here.
 */
function NotesOnlyForm({ log, isSaving, onSave }: NotesOnlyFormProps) {
  const styles = useStyles(makeStyles);

  const form = useForm<FeedLogNotesOnlyFormValues>({
    resolver: zodResolver(feedLogNotesOnlySchema),
    defaultValues: { notes: log.notes ?? '' },
    mode: 'onBlur'
  });

  const { control, handleSubmit, formState } = form;

  // Read during render so the formState Proxy actually subscribes -- see the
  // same destructure in EditableLogForm above.
  const { dirtyFields } = formState;

  const onSubmit = handleSubmit((values) => {
    if (!dirtyFields.notes) return;

    onSave({ notes: values.notes.trim().length > 0 ? values.notes.trim() : null });
  });

  return (
    <FormProvider {...form}>
      <View style={styles.form}>
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInputValidated
              name="notes"
              label="Notes"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Half a scoop, plus her tablet"
              maxLength={FEED_LOG_NOTES_MAX_LENGTH}
              height={80}
              isMultiline
              showCharacterCount
            />
          )}
        />

        <MainButton
          text="Save changes"
          isLoading={isSaving}
          isDisabled={isSaving}
          onPress={() => {
            void onSubmit();
          }}
        />
      </View>
    </FormProvider>
  );
}

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      gap: spacing.three
    },
    form: {
      gap: spacing.three
    },
    dayRow: {
      flexDirection: 'row',
      gap: spacing.two
    },
    dayChip: {
      paddingVertical: spacing.two,
      paddingHorizontal: spacing.three,
      borderRadius: 100,
      backgroundColor: colors.backgroundElement
    },
    dayChipSelected: {
      backgroundColor: colors.backgroundSelected
    }
  });

export default FeedLogDetailSheet;
