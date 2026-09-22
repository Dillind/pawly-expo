import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useMemo, type RefObject } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import FormTextInput from '@/components/core/form-text-input';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import { FEED_LOG_DAY_OPTIONS } from '@/constants/options';
import {
  FEED_LOG_NOTES_MAX_LENGTH,
  feedLogNotesOnlySchema,
  feedLogSchema,
  type FeedLogFormValues,
  type FeedLogNotesOnlyFormValues
} from '@/constants/schemas/feed-log';
import { Radius, type AppTheme } from '@/constants/theme';
import { useFeedLog } from '@/hooks/queries/feeding/use-feed-log';
import { useDeleteFeedLog, useUpdateFeedLog } from '@/hooks/queries/feeding/use-feed-log-mutations';
import { useHousehold } from '@/hooks/queries/household/use-household';
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
import { useAuthStore } from '@/stores/auth-store';
import type { FeedLog } from '@/types/core';
import { formatAuthorName } from '@/utils/members';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  logId: string | undefined;
  petId: string | undefined;
};

// Only fields the sub-forms decided to change. Never built by re-stating a
// current value: the update payload writes exactly the keys present here.
type SavePatch = { loggedAt?: string; notes?: string | null };

const FeedLogDetailSheet = ({ sheetRef, logId, petId }: Props) => {
  const styles = useStyles(makeStyles);
  const { userId } = useAuthStore();
  const { data: household } = useHousehold();
  const { data: log, isLoading } = useFeedLog(logId);
  const { mutate: updateFeedLog, isPending: isSaving } = useUpdateFeedLog(petId);
  const { mutate: deleteFeedLog, isPending: isDeleting } = useDeleteFeedLog(petId);

  const timezone = household?.timezone;

  // Presentation only; RLS is the gate. Measured from created_at, not
  // logged_at, so a backdated log is not born uneditable.
  const canEdit = Boolean(
    log &&
    (household?.isOwner ||
      (log.loggedBy === userId && dayjs().diff(dayjs(log.createdAt), 'hour') < 24))
  );

  // Owners may backdate arbitrarily far, which the Today/Yesterday control
  // cannot express. An older log shows its date read-only rather than risk the
  // toggle defaulting to the wrong day.
  const isRecent = Boolean(
    log &&
    timezone &&
    (dayInTimezone(log.loggedAt, timezone) === todayInTimezone(timezone) ||
      dayInTimezone(log.loggedAt, timezone) === yesterdayInTimezone(timezone))
  );

  const authorName = formatAuthorName(log?.author);

  const onSave = (patch: SavePatch) => {
    if (!log) return;

    updateFeedLog(
      { logId: log.id, ...patch },
      { onSuccess: () => void sheetRef.current?.dismiss() }
    );
  };

  const onDelete = () => {
    if (!log) return;

    Alert.alert('Delete this log?', 'The feed will no longer count as logged.', [
      { text: 'Cancel', style: 'cancel', isPreferred: true },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteFeedLog({ logId: log.id }, { onSuccess: () => void sheetRef.current?.dismiss() })
      }
    ]);
  };

  return (
    <BaseSheet sheetRef={sheetRef} detents={['auto']} title="Feed log">
      {isLoading || !log || !timezone ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.content}>
          <AppText size="subhead" color="textSecondary">
            {authorName} · {formatDayHeading(dayInTimezone(log.loggedAt, timezone), timezone)} ·{' '}
            {formatTimeOfDay(log.loggedAt, timezone)}
          </AppText>

          {!canEdit ? (
            <AppText size="body">{log.notes ?? 'No notes on this feed.'}</AppText>
          ) : (
            <>
              {isRecent ? (
                <EditableLogForm
                  key={log.id}
                  log={log}
                  timezone={timezone}
                  isOwner={household?.isOwner ?? false}
                  isSaving={isSaving}
                  onSave={onSave}
                />
              ) : (
                <NotesOnlyForm key={log.id} log={log} isSaving={isSaving} onSave={onSave} />
              )}

              <MainButton
                text="Delete this log"
                variant="destructive"
                isLoading={isDeleting}
                isDisabled={isSaving || isDeleting}
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

function EditableLogForm({ log, timezone, isOwner, isSaving, onSave }: EditableLogFormProps) {
  const styles = useStyles(makeStyles);

  // Role-dependent, so it cannot be a static export. The superRefine reads
  // "now" at validation time, so these two deps are enough.
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

  // formState is a Proxy that subscribes only to keys read during render, so
  // reading dirtyFields solely in the submit callback leaves it empty and every
  // save silently does nothing.
  const { dirtyFields } = formState;

  const onSubmit = handleSubmit((values) => {
    // Never send a field the user did not touch: a notes-only edit must
    // produce a patch with no loggedAt key at all.
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
              {FEED_LOG_DAY_OPTIONS.map(({ value: option, label }) => (
                <PressableOpacity
                  key={option}
                  style={[styles.dayChip, value === option && styles.dayChipSelected]}
                  onPress={() => onChange(option)}>
                  <AppText size="subhead" color={value === option ? 'text' : 'textSecondary'}>
                    {label}
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
              isLabelIndicated
              mode="time"
              selectedDate={value}
              setSelectedDate={onChange}
            />
          )}
        />

        <FormTextInput
          name="notes"
          label="Notes"
          placeholder="Half a scoop, plus her tablet"
          maxLength={FEED_LOG_NOTES_MAX_LENGTH}
          height={80}
          isMultiline
          showCharacterCount
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

// A log older than yesterday: the day control cannot represent its date, so the
// header shows it read-only and only notes are editable.
function NotesOnlyForm({ log, isSaving, onSave }: NotesOnlyFormProps) {
  const styles = useStyles(makeStyles);

  const form = useForm<FeedLogNotesOnlyFormValues>({
    resolver: zodResolver(feedLogNotesOnlySchema),
    defaultValues: { notes: log.notes ?? '' },
    mode: 'onBlur'
  });

  const { handleSubmit, formState } = form;

  // Read during render so the formState Proxy subscribes. See above.
  const { dirtyFields } = formState;

  const onSubmit = handleSubmit((values) => {
    if (!dirtyFields.notes) return;

    onSave({ notes: values.notes.trim().length > 0 ? values.notes.trim() : null });
  });

  return (
    <FormProvider {...form}>
      <View style={styles.form}>
        <FormTextInput
          name="notes"
          label="Notes"
          placeholder="Half a scoop, plus her tablet"
          maxLength={FEED_LOG_NOTES_MAX_LENGTH}
          height={80}
          isMultiline
          showCharacterCount
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
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundSheetRow
    },
    dayChipSelected: {
      backgroundColor: colors.primaryMuted
    }
  });

export default FeedLogDetailSheet;
