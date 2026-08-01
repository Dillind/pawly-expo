import AppText from '@/components/core/app-text';
import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import DropdownPickerValidated from '@/components/core/dropdown-picker-validated';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import Tray, { useTray, type TrayStepDescriptor } from '@/components/core/tray';
import type { AppTheme } from '@/constants/theme';
import { type FeedingSlot, useFeedingSchedules } from '@/hooks/use-feeding-schedules';
import { useDeleteSlot, useUpsertSlot } from '@/hooks/use-schedule-mutations';
import { useStyles } from '@/hooks/use-styles';
import FieldError from '@/lib/form/components/field-error';
import { SCHEDULE_LABELS, slotSchema, type SlotInput } from '@/lib/form/pet-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import dayjs from 'dayjs';
import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

type ListStepProps = {
  slots: FeedingSlot[];
  onSelectSlot: (slot: FeedingSlot | null) => void;
};

const ListStep = ({ slots, onSelectSlot }: ListStepProps) => {
  const styles = useStyles(makeStyles);
  const { goTo } = useTray();

  return (
    <View style={styles.list}>
      {slots.length === 0 && (
        <AppText color="textSecondary" size={14}>
          No feed times yet.
        </AppText>
      )}

      {slots.map((slot) => (
        <View key={slot.id} style={styles.slotRow}>
          <View>
            <AppText size={16}>{capitalize(slot.label)}</AppText>
            <AppText color="textSecondary" size={14}>
              {dayjs(slot.scheduledTime, 'HH:mm').format('h:mm A')}
            </AppText>
          </View>
          <IconButton
            name="pencil"
            accessibilityLabel={`Edit ${slot.label} feed`}
            variant="ghost"
            size={18}
            onPress={() => {
              onSelectSlot(slot);
              goTo('edit');
            }}
          />
        </View>
      ))}

      <IconButton
        name="plus"
        accessibilityLabel="Add a feed time"
        variant="ghost"
        size={18}
        containerStyle={styles.addButton}
        onPress={() => {
          onSelectSlot(null);
          goTo('edit');
        }}
      />
    </View>
  );
};

type EditStepProps = {
  petId: string;
  slot: FeedingSlot | null;
};

const EditStep = ({ petId, slot }: EditStepProps) => {
  const styles = useStyles(makeStyles);
  const { back } = useTray();
  const upsertSlot = useUpsertSlot(petId);
  const deleteSlot = useDeleteSlot(petId);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<SlotInput>({
    resolver: zodResolver(slotSchema),
    defaultValues: {
      label: (slot?.label as SlotInput['label']) ?? 'custom',
      scheduledTime: slot?.scheduledTime ?? '17:00'
    }
  });

  const scheduledTime = useWatch({ control, name: 'scheduledTime' });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await upsertSlot.mutateAsync({ ...values, id: slot?.id });
      back();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save the feed time');
    }
  });

  const onDelete = async () => {
    if (!slot) return;
    setSubmitError(null);
    try {
      await deleteSlot.mutateAsync(slot.id);
      back();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not remove the feed time');
    }
  };

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="label"
        render={({ field: { onChange, value } }) => (
          <DropdownPickerValidated
            label="Feed"
            items={[...SCHEDULE_LABELS]}
            value={value}
            onChange={(next) => onChange(next as SlotInput['label'])}
            getText={capitalize}
          />
        )}
      />

      <Controller
        control={control}
        name="scheduledTime"
        render={({ field: { onChange } }) => (
          <DateTimePickerValidated
            mode="time"
            label="Time fed"
            selectedDate={scheduledTime}
            setSelectedDate={onChange}
          />
        )}
      />

      <FieldError error={submitError ?? undefined} />

      <MainButton
        text={upsertSlot.isPending ? 'Saving…' : 'Save'}
        isLoading={upsertSlot.isPending}
        isDisabled={upsertSlot.isPending || deleteSlot.isPending}
        onPress={() => void onSubmit()}
      />

      {slot && (
        <MainButton
          text={deleteSlot.isPending ? 'Removing…' : 'Remove this feed'}
          variant="text"
          isLoading={deleteSlot.isPending}
          isDisabled={upsertSlot.isPending || deleteSlot.isPending}
          onPress={() => void onDelete()}
        />
      )}
    </View>
  );
};

type Props = { petId: string };

const ScheduleSection = ({ petId }: Props) => {
  const styles = useStyles(makeStyles);
  const sheetRef = useRef<TrueSheet | null>(null);
  const [editingSlot, setEditingSlot] = useState<FeedingSlot | null>(null);
  const { data: slots = [] } = useFeedingSchedules(petId);

  const steps: TrayStepDescriptor[] = [
    {
      id: 'list',
      title: 'Feeding schedule',
      render: () => <ListStep slots={slots} onSelectSlot={setEditingSlot} />
    },
    {
      id: 'edit',
      title: editingSlot ? `Edit ${capitalize(editingSlot.label)} feed` : 'Add a feed time',
      render: () => <EditStep petId={petId} slot={editingSlot} />
    }
  ];

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <AppText variant="header" size={20}>
          Feeding schedule
        </AppText>
        <IconButton
          name="plus"
          accessibilityLabel="Add a feed time"
          variant="ghost"
          onPress={() => void sheetRef.current?.present()}
        />
      </View>

      <Tray sheetRef={sheetRef} steps={steps} onDismiss={() => setEditingSlot(null)} />
    </View>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    section: { gap: spacing.two },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    list: { gap: spacing.two },
    slotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.one,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.textSecondary
    },
    addButton: { alignSelf: 'flex-start' },
    form: { gap: spacing.three }
  });

export default ScheduleSection;
