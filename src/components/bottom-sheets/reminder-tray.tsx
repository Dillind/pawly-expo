import AppText from '@/components/core/app-text';
import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import Tray, { useTray, type TrayStepDescriptor } from '@/components/core/tray';
import PetAvatar from '@/components/screens/home/pet-avatar';
import {
  DEFAULT_REMINDER_LEAD_DAYS,
  REMINDER_KIND_OPTIONS,
  REMINDER_LEAD_OPTIONS,
  REMINDER_REPEAT_OPTIONS
} from '@/constants/options';
import { reminderSchema, type ReminderFormValues } from '@/constants/schemas/reminder';
import { Radius, type AppTheme } from '@/constants/theme';
import { useCreateReminder } from '@/hooks/queries/reminder/use-reminder-mutations';
import { useStyles } from '@/hooks/use-styles';
import { formatReminderDate, formatScheduledTime } from '@/lib/dates';
import type { Option, Pet } from '@/types/core';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useCallback, type RefObject } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  pet: Pet;
  /** Today in the household's timezone. The reminder cannot start before it. */
  today: string;
};

/**
 * A row of pills. The selected one fills with its own colour, never gold --
 * gold is the primary action, and this is a choice.
 */
const PillRow = <T extends string | number>({
  options,
  value,
  fill,
  onChange
}: {
  options: Option<T>[];
  value: T;
  fill?: (option: Option<T>) => string | undefined;
  onChange: (value: T) => void;
}) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.pills}>
      {options.map((option) => {
        const isSelected = option.value === value;
        const background = isSelected ? fill?.(option) : undefined;

        return (
          <PressableOpacity
            key={String(option.value)}
            style={[
              styles.pill,
              isSelected && styles.pillSelected,
              background ? { backgroundColor: background } : null
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(option.value)}>
            <AppText size={14} fontWeight={isSelected ? 'bold' : 'regular'}>
              {option.label}
            </AppText>
          </PressableOpacity>
        );
      })}
    </View>
  );
};

type StepValues = ReminderFormValues;

type SetValue = (field: keyof StepValues, value: StepValues[keyof StepValues]) => void;

const WhatStep = ({
  title,
  kind,
  onChange
}: {
  title: string;
  kind: StepValues['kind'];
  onChange: SetValue;
}) => {
  const styles = useStyles(makeStyles);
  const { goTo } = useTray();

  return (
    <View style={styles.stack}>
      <TextInputValidated
        name="title"
        label="Name"
        placeholder="Worming tablet"
        value={title}
        onChangeText={(next) => onChange('title', next)}
      />

      <View style={styles.field}>
        <AppText size={14} fontWeight="bold">
          Kind
        </AppText>
        <PillRow
          options={REMINDER_KIND_OPTIONS}
          value={kind}
          fill={(option) =>
            option.value === 'medication'
              ? styles.medicationFill.backgroundColor
              : option.value === 'vet'
                ? styles.vetFill.backgroundColor
                : undefined
          }
          onChange={(next) => onChange('kind', next)}
        />
      </View>

      <MainButton text="Next" isDisabled={title.trim().length === 0} onPress={() => goTo('when')} />
    </View>
  );
};

const WhenStep = ({
  startsOn,
  localTime,
  repeat,
  leadDays,
  onChange
}: {
  startsOn: string;
  localTime: string;
  repeat: StepValues['repeat'];
  leadDays: StepValues['leadDays'];
  onChange: SetValue;
}) => {
  const styles = useStyles(makeStyles);
  const { goTo } = useTray();

  return (
    <View style={styles.stack}>
      <DateTimePickerValidated
        name="startsOn"
        mode="date"
        label="Date"
        selectedDate={startsOn}
        setSelectedDate={(next) => onChange('startsOn', next)}
      />

      <DateTimePickerValidated
        name="localTime"
        mode="time"
        label="Time"
        selectedDate={localTime}
        setSelectedDate={(next) => onChange('localTime', next)}
      />

      <View style={styles.field}>
        <AppText size={14} fontWeight="bold">
          Repeat
        </AppText>
        <PillRow
          options={REMINDER_REPEAT_OPTIONS}
          value={repeat}
          onChange={(next) => onChange('repeat', next)}
        />
      </View>

      {/* "Tell us" rather than "Lead time": the Member's own nudge setting is
          already called Lead Time and is measured in minutes. */}
      <View style={styles.field}>
        <AppText size={14} fontWeight="bold">
          Tell us
        </AppText>
        <PillRow
          options={REMINDER_LEAD_OPTIONS}
          value={leadDays}
          onChange={(next) => onChange('leadDays', next)}
        />
      </View>

      <MainButton text="Next" onPress={() => goTo('who')} />
    </View>
  );
};

const WhoStep = ({
  pet,
  title,
  startsOn,
  localTime,
  isSaving,
  onSubmit
}: {
  pet: Pet;
  title: string;
  startsOn: string;
  localTime: string;
  isSaving: boolean;
  onSubmit: () => void;
}) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.stack}>
      <View style={styles.summary}>
        <PetAvatar photoUrl={pet.photoUrl} size={40} />

        <View style={styles.summaryText}>
          <AppText size={16} fontWeight="bold">
            {pet.name}
          </AppText>
          <AppText size={13} color="textSecondary">
            {title} · {formatReminderDate(startsOn)}, {formatScheduledTime(localTime)}
          </AppText>
        </View>
      </View>

      <AppText size={13} color="textSecondary">
        Everyone in the household is told.
      </AppText>

      <MainButton
        text="Add reminder"
        isLoading={isSaving}
        isDisabled={isSaving}
        onPress={onSubmit}
      />
    </View>
  );
};

const ReminderTray = ({ sheetRef, pet, today }: Props) => {
  const { mutate: createReminder, isPending: isSaving } = useCreateReminder();

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      kind: 'medication',
      startsOn: today,
      localTime: '09:00',
      repeat: 'once',
      leadDays: DEFAULT_REMINDER_LEAD_DAYS
    }
  });

  const { control, setValue, handleSubmit, reset } = form;

  // useWatch, never watch(): watch subscribes by mutating during render, which
  // React Compiler cannot memoise.
  const title = useWatch({ control, name: 'title' });
  const kind = useWatch({ control, name: 'kind' });
  const startsOn = useWatch({ control, name: 'startsOn' });
  const localTime = useWatch({ control, name: 'localTime' });
  const repeat = useWatch({ control, name: 'repeat' });
  const leadDays = useWatch({ control, name: 'leadDays' });

  const change = useCallback<SetValue>(
    (field, value) => {
      setValue(field, value as never, { shouldValidate: true });
    },
    [setValue]
  );

  const submit = handleSubmit((values) => {
    createReminder({ petId: pet.id, ...values }, { onSuccess: () => reset() });
  });

  // Rebuilt each render on purpose: the descriptors carry the current values.
  // The step COMPONENTS are module-level, so this recreates elements, never
  // types -- an inline component type would remount the name field on every
  // keystroke and drop the keyboard.
  const steps: TrayStepDescriptor[] = [
    {
      id: 'what',
      title: 'What is it?',
      render: () => <WhatStep title={title} kind={kind} onChange={change} />
    },
    {
      id: 'when',
      title: 'When?',
      render: () => (
        <WhenStep
          startsOn={startsOn}
          localTime={localTime}
          repeat={repeat}
          leadDays={leadDays}
          onChange={change}
        />
      )
    },
    {
      id: 'who',
      title: 'Who is it for?',
      render: () => (
        <WhoStep
          pet={pet}
          title={title}
          startsOn={startsOn}
          localTime={localTime}
          isSaving={isSaving}
          onSubmit={() => void submit()}
        />
      )
    }
  ];

  return (
    <FormProvider {...form}>
      <Tray sheetRef={sheetRef} steps={steps} onDismiss={() => reset()} />
    </FormProvider>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    stack: { gap: spacing.three },
    field: { gap: spacing.two },
    pills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.two
    },
    pill: {
      paddingVertical: spacing.two,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border
    },
    pillSelected: {
      backgroundColor: colors.backgroundSelected,
      borderColor: 'transparent'
    },
    // Read through StyleSheet rather than inline so the two trial tokens have
    // exactly one call site each. See DECISIONS.md.
    medicationFill: { backgroundColor: colors.medicationMuted },
    vetFill: { backgroundColor: colors.vetMuted },
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three
    },
    summaryText: { flex: 1, gap: 2 }
  });

export default ReminderTray;
