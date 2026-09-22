import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import InfoSheet from '@/components/bottom-sheets/info-sheet';
import ReminderTray from '@/components/bottom-sheets/reminder-tray';
import AppText from '@/components/core/app-text';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import SectionLabel from '@/components/core/section-label';
import SectionCard from '@/components/screens/pet/section-card';
import ReminderRow from '@/components/ui/reminder-row';
import { REMINDERS_HELP } from '@/constants/reminders-help';
import { IconSize, type AppTheme } from '@/constants/theme';
import { isTickPending, useTickReminder } from '@/hooks/queries/reminder/use-reminder-mutations';
import { useUpcomingReminders } from '@/hooks/queries/reminder/use-reminders';
import { useStyles } from '@/hooks/use-styles';
import { formatReminderDate, shiftDays } from '@/lib/dates';
import type { Pet } from '@/types/core';

type Props = {
  pet: Pet;
  today: string;
};

// Bounds, not a view: a weekly rule read over an open range is unbounded.
const HORIZON_DAYS = 60;
const VISIBLE_LIMIT = 6;

const RemindersSection = ({ pet, today }: Props) => {
  const styles = useStyles(makeStyles);
  const trayRef = useRef<TrueSheet | null>(null);
  const helpRef = useRef<TrueSheet | null>(null);

  const { data: reminders = [] } = useUpcomingReminders(
    pet.id,
    today,
    shiftDays(today, HORIZON_DAYS)
  );
  const { mutate: tickReminder, isPending: isTicking, variables: tickingInput } = useTickReminder();

  const visible = reminders.slice(0, VISIBLE_LIMIT);
  const hiddenCount = reminders.length - visible.length;

  return (
    <>
      <SectionCard>
        <View style={styles.stack}>
          <SectionLabel
            action={
              <IconButton
                name="info"
                accessibilityLabel="What is a Reminder?"
                variant="ghost"
                size={IconSize.action}
                onPress={() => void helpRef.current?.present()}
              />
            }
            isHeading>
            Reminders
          </SectionLabel>

          {visible.length > 0 ? (
            visible.map((reminder) => (
              <ReminderRow
                key={`${reminder.reminderId}-${reminder.occurrenceDate}`}
                reminder={reminder}
                dateLabel={
                  reminder.occurrenceDate === today
                    ? undefined
                    : formatReminderDate(reminder.occurrenceDate)
                }
                isTicking={isTickPending(
                  isTicking,
                  tickingInput,
                  reminder.reminderId,
                  reminder.occurrenceDate
                )}
                // Nothing to tick off yet: the row says "Future" instead.
                onTick={
                  reminder.state === 'future'
                    ? undefined
                    : () =>
                        tickReminder({
                          reminderId: reminder.reminderId,
                          occurrenceDate: reminder.occurrenceDate,
                          isDone: reminder.state === 'done'
                        })
                }
              />
            ))
          ) : (
            <AppText size="subhead" color="textSecondary">
              A worming tablet, a vet appointment. Everyone in the household is told.
            </AppText>
          )}

          {hiddenCount > 0 && (
            <AppText size="footnote" color="textSecondary">
              {`${hiddenCount} more still to come.`}
            </AppText>
          )}

          <MainButton
            text="Add a reminder"
            variant="text"
            size="sm"
            onPress={() => void trayRef.current?.present()}
          />
        </View>
      </SectionCard>

      {/* A sibling, never a child: presented from inside the card it
          belongs to is still a sibling of it in the tree. */}
      <ReminderTray sheetRef={trayRef} pet={pet} today={today} />

      <InfoSheet sheetRef={helpRef} {...REMINDERS_HELP} />
    </>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    stack: {
      gap: spacing.two
    }
  });

export default RemindersSection;
