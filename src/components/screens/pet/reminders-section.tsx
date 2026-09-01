import InfoSheet from '@/components/bottom-sheets/info-sheet';
import ReminderTray from '@/components/bottom-sheets/reminder-tray';
import AppText from '@/components/core/app-text';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import SectionLabel from '@/components/core/section-label';
import ReminderRow from '@/components/ui/reminder-row';
import SectionCard from '@/components/screens/pet/section-card';
import { REMINDERS_HELP } from '@/constants/reminders-help';
import type { AppTheme } from '@/constants/theme';
import { useTickReminder } from '@/hooks/queries/reminder/use-reminder-mutations';
import { useReminders } from '@/hooks/queries/reminder/use-reminders';
import { useStyles } from '@/hooks/use-styles';
import type { Pet } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  pet: Pet;
  /** Today in the household's timezone. */
  today: string;
};

/**
 * The dated jobs that are not feeds. Today's only — the week strip on Home is
 * where another day is reached, and a list of every future occurrence of a
 * monthly rule is unbounded.
 */
const RemindersSection = ({ pet, today }: Props) => {
  const styles = useStyles(makeStyles);
  const trayRef = useRef<TrueSheet | null>(null);
  const helpRef = useRef<TrueSheet | null>(null);

  const { data: reminders = [] } = useReminders(pet.id, today);
  const { mutate: tickReminder, isPending: isTicking } = useTickReminder();

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
                size={20}
                onPress={() => void helpRef.current?.present()}
              />
            }
            isHeading>
            Reminders
          </SectionLabel>

          {reminders.length > 0 ? (
            reminders.map((reminder) => (
              <ReminderRow
                key={reminder.reminderId}
                reminder={reminder}
                isTicking={isTicking}
                onTick={() =>
                  tickReminder({
                    reminderId: reminder.reminderId,
                    occurrenceDate: reminder.occurrenceDate,
                    isDone: reminder.state === 'done'
                  })
                }
              />
            ))
          ) : (
            <AppText size={14} color="textSecondary">
              A worming tablet, a vet appointment. Everyone in the household is told.
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

      {/* A sibling, never a child: a sheet presented from inside the card it
          belongs to is still a sibling of it in the tree. */}
      <ReminderTray sheetRef={trayRef} pet={pet} today={today} />

      <InfoSheet sheetRef={helpRef} {...REMINDERS_HELP} />
    </>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    stack: { gap: spacing.two }
  });

export default RemindersSection;
