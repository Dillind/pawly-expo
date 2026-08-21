import AppText from '@/components/core/app-text';
import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import Divider from '@/components/core/divider';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import Tray, { useTray, type TrayStepDescriptor } from '@/components/core/tray';
import PetAvatar from '@/components/screens/home/pet-avatar';
import { Radius, type AppTheme } from '@/constants/theme';
import { useOccurrences } from '@/hooks/queries/feeding/use-occurrences';
import FeedTimeService from '@/services/feed-time.service';
import { useQueries } from '@tanstack/react-query';
import type { useLogFlow } from '@/hooks/use-log-flow';
import { useStyles } from '@/hooks/use-styles';
import { newFeedLogSchema, type NewFeedLogFormValues } from '@/constants/schemas/feed-log';
import { composeLoggedAt, formatScheduledTime, timeInTimezone } from '@/lib/dates';
import type { Occurrence, Pet } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, type RefObject } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

type Flow = ReturnType<typeof useLogFlow>;

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  pets: Pet[];
  today: string;
  timezone: string;
  /** Preselected by a per-pet Log button, which already knows its pet. */
  pet?: Pet;
  flow: Flow;
};

const LABEL_TEXT: Record<Occurrence['label'], string> = {
  morning: 'Morning',
  lunch: 'Lunch',
  dinner: 'Dinner',
  custom: 'Feed'
};

/**
 * Several pets at once, because one person feeding two animals is one trip to
 * the kitchen, not two. A tick rather than a radio: this is a set, and the
 * button counts it back.
 */
const PetPickerStep = ({
  pets,
  selected,
  onToggle
}: {
  pets: Pet[];
  selected: Pet[];
  onToggle: (pet: Pet) => void;
}) => {
  const styles = useStyles(makeStyles);
  const { goTo } = useTray();

  return (
    <View style={styles.stack}>
      <AppText size={14} fontWeight="bold">
        Who did you feed?
      </AppText>

      <View style={styles.list}>
        {pets.map((pet) => {
          const isSelected = selected.some((each) => each.id === pet.id);

          return (
            <PressableOpacity
              key={pet.id}
              style={styles.petRow}
              accessibilityRole="checkbox"
              accessibilityLabel={pet.name}
              accessibilityState={{ checked: isSelected }}
              onPress={() => onToggle(pet)}>
              <PetAvatar photoUrl={pet.photoUrl} size={32} />

              <AppText size={16} style={styles.petName}>
                {pet.name}
              </AppText>

              {isSelected && <Icon name="check" size={18} color="primary" />}
            </PressableOpacity>
          );
        })}
      </View>

      <MainButton
        text={selected.length > 1 ? `Continue with ${selected.length} pets` : 'Continue'}
        isDisabled={selected.length === 0}
        onPress={() => goTo('feed')}
      />
    </View>
  );
};

/** Which feed this was. "Not on the schedule" is the Extra Feed, chosen. */
const FeedPickerStep = ({
  pet,
  today,
  onPick
}: {
  pet: Pet | undefined;
  today: string;
  onPick: (occurrence: Occurrence | null) => void;
}) => {
  const styles = useStyles(makeStyles);
  const { goTo } = useTray();
  const { data: occurrences, isLoading } = useOccurrences(pet?.id, today);

  if (!pet || isLoading || !occurrences) return <ActivityIndicator />;

  const choose = (occurrence: Occurrence | null) => {
    onPick(occurrence);
    goTo('confirm');
  };

  return (
    <View style={styles.list}>
      {occurrences.map((occurrence) => (
        <PressableOpacity
          key={occurrence.seriesId}
          style={styles.petRow}
          accessibilityRole="button"
          accessibilityLabel={`${LABEL_TEXT[occurrence.label]} at ${formatScheduledTime(occurrence.localTime)}`}
          onPress={() => choose(occurrence)}>
          <View style={styles.petName}>
            <AppText size={16}>{LABEL_TEXT[occurrence.label]}</AppText>
            <AppText size={13} color="textSecondary">
              {formatScheduledTime(occurrence.localTime)}
              {occurrence.state === 'fed' ? '  ·  already logged' : ''}
            </AppText>
          </View>

          <Icon name="caretRight" size={16} color="textSecondary" />
        </PressableOpacity>
      ))}

      <PressableOpacity
        style={styles.petRow}
        accessibilityRole="button"
        accessibilityLabel="Not on the schedule"
        onPress={() => choose(null)}>
        <View style={styles.petName}>
          <AppText size={16}>Not on the schedule</AppText>
          <AppText size={13} color="textSecondary">
            A snack, or a feed you do not plan for.
          </AppText>
        </View>

        <Icon name="caretRight" size={16} color="textSecondary" />
      </PressableOpacity>
    </View>
  );
};

const ConfirmStep = ({
  pets,
  occurrence,
  today,
  timezone,
  isLogging,
  onLog
}: {
  pets: Pet[];
  occurrence: Occurrence | null;
  today: string;
  timezone: string;
  isLogging: boolean;
  onLog: (
    input: { loggedAt: string; notes: string | null },
    matches: Record<string, Occurrence | undefined>
  ) => void;
}) => {
  const styles = useStyles(makeStyles);

  const schema = useMemo(() => newFeedLogSchema({ timezone }), [timezone]);
  const form = useForm<NewFeedLogFormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      // The truth is that the feed happened now. Anything else is a correction,
      // so it starts here and the member changes it deliberately. Read in the
      // household's timezone, never the device's (ADR 0009).
      time: timeInTimezone(new Date().toISOString(), timezone),
      notes: ''
    }
  });
  const { control, handleSubmit } = form;

  // Each pet's own occurrence for the chosen feed. One query per pet, because a
  // hook cannot be called from a loop -- useQueries is the sanctioned shape.
  // Without this the other pets would be logged as Extra Feeds and the sweep
  // would nudge about animals that were just fed.
  const occurrenceQueries = useQueries({
    queries: pets.map((pet) => ({
      queryKey: ['occurrences', pet.id, today],
      queryFn: () => FeedTimeService.getOccurrences(pet.id, today)
    }))
  });

  const matches: Record<string, Occurrence | undefined> = {};

  if (occurrence) {
    pets.forEach((pet, index) => {
      // Match on the feed, never on its state. Excluding an already-fed
      // occurrence here would quietly turn a deliberate re-log into an Extra
      // Feed and skip the Double Feed warning entirely -- log_feed is what
      // decides that, and it needs to be given the occurrence to decide about.
      // The label is the only key that carries across pets, and several feeds
      // can share `custom` -- so the time settles it, and an ambiguous label
      // resolves to nothing rather than to a guess.
      const sameLabel = (occurrenceQueries[index]?.data ?? []).filter(
        (each) => each.label === occurrence.label
      );

      matches[pet.id] =
        sameLabel.find((each) => each.localTime === occurrence.localTime) ??
        (sameLabel.length === 1 ? sameLabel[0] : undefined);
    });
  }
  // The household's local day plus the chosen wall-clock time. composeLoggedAt
  // is the one place that arithmetic lives; do not rebuild it from the device
  // clock. The schema has already refused a future time by this point.
  const submit = handleSubmit((values) =>
    onLog(
      {
        loggedAt: composeLoggedAt('today', values.time, timezone),
        notes: values.notes.trim() === '' ? null : values.notes.trim()
      },
      matches
    )
  );

  return (
    <FormProvider {...form}>
      <View style={styles.stack}>
        <View style={styles.petsSummary}>
          {pets.map((pet) => (
            <View key={pet.id} style={styles.petSummaryRow}>
              <PetAvatar photoUrl={pet.photoUrl} size={32} />
              <AppText size={16}>{pet.name}</AppText>
            </View>
          ))}
        </View>

        {occurrence?.instructions ? (
          <View style={styles.instructions}>
            <AppText size={14}>{occurrence.instructions}</AppText>
          </View>
        ) : null}

        <Divider />

        <Controller
          control={control}
          name="time"
          render={({ field: { onChange, value } }) => (
            <DateTimePickerValidated
              name="time"
              mode="time"
              label="Fed at"
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
              label="Note"
              placeholder="Anything worth passing on"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              isMultiline
            />
          )}
        />

        <MainButton
          text={pets.length > 1 ? `Log for ${pets.length} pets` : 'Log this feed'}
          isLoading={isLogging}
          isDisabled={isLogging}
          onPress={() => void submit()}
        />
      </View>
    </FormProvider>
  );
};

const PetHeading = ({ pet }: { pet: Pet }) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.heading}>
      <PetAvatar photoUrl={pet.photoUrl} size={32} />
      <AppText variant="header" size={18}>
        {pet.name}
      </AppText>
    </View>
  );
};

/**
 * Raised when there is something to ask: which pets, which feed, and at what
 * time. Tapping Log on a Home row asks none of those and writes without this.
 */
const LogFeedTray = ({ sheetRef, pets, today, timezone, pet, flow }: Props) => {
  const [selected, setSelected] = useState<Pet[]>([]);
  const [occurrence, setOccurrence] = useState<Occurrence | null>(null);

  const onlyPet = pets.length === 1 ? pets[0] : undefined;
  const preselected = pet ?? onlyPet;
  const active = preselected ? [preselected] : selected;

  const reset = () => {
    setSelected([]);
    setOccurrence(null);
  };

  const toggle = (next: Pet) =>
    setSelected((current) =>
      current.some((each) => each.id === next.id)
        ? current.filter((each) => each.id !== next.id)
        : [...current, next]
    );

  const feedStep: TrayStepDescriptor = {
    id: 'feed',
    title: 'Which feed?',
    header: active.length === 1 ? () => <PetHeading pet={active[0]} /> : undefined,
    // The feeds offered are the first pet's. Two pets rarely share a schedule,
    // and asking per pet would turn one trip to the kitchen into two flows.
    render: () => (
      <FeedPickerStep key={active[0]?.id} pet={active[0]} today={today} onPick={setOccurrence} />
    )
  };

  const confirmStep: TrayStepDescriptor = {
    id: 'confirm',
    title: occurrence
      ? `${LABEL_TEXT[occurrence.label]}  ·  ${formatScheduledTime(occurrence.localTime)}`
      : 'Log a feed',
    render: () => (
      <ConfirmStep
        pets={active}
        occurrence={occurrence}
        today={today}
        timezone={timezone}
        isLogging={flow.isLogging}
        onLog={(input, matches) => flow.log(active, occurrence, input, matches)}
      />
    )
  };

  const steps: TrayStepDescriptor[] = preselected
    ? [feedStep, confirmStep]
    : [
        {
          id: 'pet',
          title: 'Log a feed',
          render: () => <PetPickerStep pets={pets} selected={selected} onToggle={toggle} />
        },
        feedStep,
        confirmStep
      ];

  return <Tray sheetRef={sheetRef} steps={steps} onDismiss={reset} />;
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    stack: { gap: spacing.three },
    list: { gap: spacing.two },
    petRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.two,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundSheetRow
    },
    petName: { flex: 1, gap: 2 },
    petsSummary: { gap: spacing.two },
    petSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.three },
    instructions: {
      padding: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundSheetRow
    },
    heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.two }
  });

export default LogFeedTray;
