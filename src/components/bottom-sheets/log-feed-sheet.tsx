import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import {
  FEED_LOG_NOTES_MAX_LENGTH,
  feedLogNotesOnlySchema,
  type FeedLogNotesOnlyFormValues
} from '@/constants/schemas/feed-log';
import type { AppTheme } from '@/constants/theme';
import { useLogFeed } from '@/hooks/queries/use-feed-log-mutations';
import type { LogFeedResult } from '@/services/feed-log.service';
import { useHousehold } from '@/hooks/queries/use-household';
import { useHouseholdMembers } from '@/hooks/queries/use-household-members';
import { formatAuthorName, memberDisplayName } from '@/utils/members';
import { usePet } from '@/hooks/queries/use-pet';
import { useStyles } from '@/hooks/use-styles';
import { useAuthStore } from '@/stores/auth-store';
import { formatScheduledTime, formatTimeOfDay } from '@/lib/dates';
import { feedLogErrorMessage } from '@/lib/feed-log-errors';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useState, type RefObject } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
};

type Warning = Extract<LogFeedResult, { status: 'double_feed' }>;

const slotLabelText: Record<Warning['slot']['label'], string> = {
  morning: 'morning',
  lunch: 'lunch',
  dinner: 'dinner',
  custom: 'scheduled'
};

/**
 * Names who is actually about to hear about this feed. Delivery is the
 * recipient's decision (ADR 0012), so this states what will happen rather than
 * offering a lever over someone else's awareness.
 *
 * Returns null for an empty list: "Nobody will be notified" invites a fix for
 * something that is not broken.
 */
function notifiedSentence(names: string[]): string | null {
  if (names.length === 0) return null;
  if (names.length === 1) return `${names[0]} will be notified`;
  if (names.length === 2) return `${names[0]} and ${names[1]} will be notified`;

  const remaining = names.length - 2;

  return `${names[0]}, ${names[1]} and ${remaining} ${
    remaining === 1 ? 'other' : 'others'
  } will be notified`;
}

/**
 * Creates a feed log. The Double Feed warning renders INLINE rather than in a
 * second sheet, for two reasons: a native sheet raised while another
 * presentation is up gets swallowed by iOS, and the warning is about the thing
 * the user is already looking at -- pushing it onto another surface would lose
 * the notes they just typed.
 */
const LogFeedSheet = ({ sheetRef }: Props) => {
  const styles = useStyles(makeStyles);
  const [warning, setWarning] = useState<Warning | null>(null);

  const { userId } = useAuthStore();
  const { data: pet } = usePet();
  const { data: household } = useHousehold();
  const { data: members = [] } = useHouseholdMembers();

  const { mutate: logFeed, isPending: isLogging } = useLogFeed(pet?.id);
  const timezone = household?.timezone;

  // First names, matching formatAuthorName -- the sheet has to agree with the
  // notification, the Home slot row, the Activity row and the detail sheet.
  const notified = notifiedSentence(
    members
      .filter((member) => member.userId !== userId && member.feedLoggedAlerts)
      .map((member) => formatAuthorName(member))
  );

  const form = useForm<FeedLogNotesOnlyFormValues>({
    resolver: zodResolver(feedLogNotesOnlySchema),
    defaultValues: { notes: '' },
    mode: 'onBlur'
  });

  const { control, handleSubmit, reset } = form;

  const submit = (notes: string, confirmed: boolean) => {
    logFeed(
      { notes: notes.trim().length > 0 ? notes.trim() : null, confirmed },
      {
        onSuccess: (result) => {
          if (result.status === 'double_feed') {
            // Nothing was written. The sheet stays open and the button becomes
            // "Log anyway", which re-calls with confirmed: true.
            setWarning(result);
            return;
          }

          showSuccessToast(`Logged a feed for ${pet?.name ?? 'your pet'}`);
          void sheetRef.current?.dismiss();
        },
        onError: (error) => {
          showErrorToast(feedLogErrorMessage(error));
        }
      }
    );
  };

  // handleSubmit(...) is invoked here, inside the press handler, rather than
  // during render (`const onSubmit = handleSubmit(...)`) -- the callback
  // reads sheetRef.current transitively through submit, and react-hooks/refs
  // flags a ref read reachable from a render-time call as unsafe even though
  // the actual invocation only happens on press.
  const onSubmit = () => {
    void handleSubmit((values) => {
      submit(values.notes, warning !== null);
    })();
  };

  return (
    <BaseSheet
      sheetRef={sheetRef}
      detents={['auto']}
      title="Log a feed"
      onDismiss={() => {
        setWarning(null);
        reset({ notes: '' });
      }}>
      <FormProvider {...form}>
        <View style={styles.content}>
          <AppText size={14} color="textSecondary">
            {pet?.name ?? 'Your pet'} · now
          </AppText>

          {warning && timezone && (
            <View style={styles.warning}>
              <Icon name="circleAlert" size={18} color="accent" />
              <AppText size={14} style={styles.warningBody}>
                {memberDisplayName(members, warning.existing.loggedBy)} already logged the{' '}
                {slotLabelText[warning.slot.label]} feed at{' '}
                {formatScheduledTime(warning.slot.scheduledTime)}, at{' '}
                {formatTimeOfDay(warning.existing.loggedAt, timezone)}.
              </AppText>
            </View>
          )}

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

          {notified && (
            <AppText size={13} color="textSecondary">
              {notified}
            </AppText>
          )}

          <MainButton
            text={warning ? 'Log anyway' : 'Log feed'}
            isLoading={isLogging}
            isDisabled={!pet?.id || isLogging}
            onPress={() => {
              void onSubmit();
            }}
          />
        </View>
      </FormProvider>
    </BaseSheet>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      gap: spacing.three
    },
    warning: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.two,
      padding: spacing.three,
      borderRadius: 12,
      backgroundColor: colors.backgroundElement
    },
    warningBody: {
      flex: 1
    }
  });

export default LogFeedSheet;
