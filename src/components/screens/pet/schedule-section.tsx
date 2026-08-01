import AppText from '@/components/core/app-text';
import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import DropdownPickerValidated from '@/components/core/dropdown-picker-validated';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import Tray, { type TrayStepDescriptor } from '@/components/core/tray';
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
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

type EditStepProps = {
  petId: string;
  slot: FeedingSlot | null;
  onDone: () => void;
};

const EditStep = ({ petId, slot, onDone }: EditStepProps) => {
  const styles = useStyles(makeStyles);
  const upsertSlot = useUpsertSlot(petId);
  const deleteSlot = useDeleteSlot(petId);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<SlotInput>({
    resolver: zodResolver(slotSchema),
    defaultValues: {
      label: (slot?.label as SlotInput['label']) ?? 'custom',
      scheduledTime: slot?.scheduledTime ?? '17:00'
    }
  });
  const { control, handleSubmit } = form;

  const scheduledTime = useWatch({ control, name: 'scheduledTime' });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await upsertSlot.mutateAsync({ ...values, id: slot?.id });
      onDone();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save the feed time');
    }
  });

  const onDelete = async () => {
    if (!slot) return;
    setSubmitError(null);
    try {
      await deleteSlot.mutateAsync(slot.id);
      onDone();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not remove the feed time');
    }
  };

  return (
    <FormProvider {...form}>
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
    </FormProvider>
  );
};

type Props = { petId: string };

const ScheduleSection = ({ petId }: Props) => {
  const styles = useStyles(makeStyles);
  const sheetRef = useRef<TrueSheet | null>(null);
  const [editingSlot, setEditingSlot] = useState<FeedingSlot | null>(null);
  const { data: slots = [] } = useFeedingSchedules(petId);

  const openEdit = (slot: FeedingSlot | null) => {
    setEditingSlot(slot);
    void sheetRef.current?.present();
  };

  const steps: TrayStepDescriptor[] = [
    {
      id: 'edit',
      title: editingSlot ? `Edit ${capitalize(editingSlot.label)} feed` : 'Add a feed time',
      render: () => (
        <EditStep
          petId={petId}
          slot={editingSlot}
          onDone={() => void sheetRef.current?.dismiss()}
        />
      )
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
          onPress={() => openEdit(null)}
        />
      </View>

      {slots.length === 0 && (
        <AppText color="textSecondary" size={14}>
          No feed times yet. Add one to get missed-feed alerts.
        </AppText>
      )}

      {slots.length > 0 && (
        <View style={styles.list}>
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
                onPress={() => openEdit(slot)}
              />
            </View>
          ))}
        </View>
      )}

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
    form: { gap: spacing.three }
  });

export default ScheduleSection;
