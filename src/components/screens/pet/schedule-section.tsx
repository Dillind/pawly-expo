import AppText from '@/components/core/app-text';
import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import DropdownPickerValidated from '@/components/core/dropdown-picker-validated';
import ErrorState from '@/components/core/error-state';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import Tray, { type TrayStepDescriptor } from '@/components/core/tray';
import { FEEDING_SCHEDULE_LABEL_OPTIONS } from '@/constants/options';
import type { AppTheme } from '@/constants/theme';
import { useFeedingSchedules } from '@/hooks/queries/feeding/use-feeding-schedules';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useDeleteSlot, useUpsertSlot } from '@/hooks/queries/feeding/use-schedule-mutations';
import { useStyles } from '@/hooks/use-styles';
import { slotSchema, type SlotInput } from '@/lib/form/pet-schemas';
import type { FeedingSlot } from '@/services/feeding-schedule.service';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import dayjs from 'dayjs';
import { useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

type EditStepProps = {
  petId: string;
  slot: FeedingSlot | null;
  onDone: () => void;
};

const EditStep = ({ petId, slot, onDone }: EditStepProps) => {
  const styles = useStyles(makeStyles);
  const { mutate: upsertSlot, isPending: isSaving } = useUpsertSlot(petId);
  const { mutate: deleteSlot, isPending: isDeleting } = useDeleteSlot(petId);

  const form = useForm<SlotInput>({
    resolver: zodResolver(slotSchema),
    defaultValues: {
      label: slot?.label ?? 'custom',
      scheduledTime: slot?.scheduledTime ?? '17:00'
    }
  });
  const { control, handleSubmit } = form;

  const scheduledTime = useWatch({ control, name: 'scheduledTime' });

  const onSubmit = handleSubmit((values) => {
    upsertSlot({ ...values, id: slot?.id }, { onSuccess: onDone });
  });

  const onDelete = () => {
    if (!slot) return;

    deleteSlot(slot.id, { onSuccess: onDone });
  };

  return (
    <FormProvider {...form}>
      <View style={styles.form}>
        <Controller
          control={control}
          name="label"
          render={({ field: { onChange, value } }) => (
            <DropdownPickerValidated
              name="label"
              label="Feed"
              options={FEEDING_SCHEDULE_LABEL_OPTIONS}
              value={value}
              onChange={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="scheduledTime"
          render={({ field: { onChange } }) => (
            <DateTimePickerValidated
              name="scheduledTime"
              mode="time"
              label="Time fed"
              selectedDate={scheduledTime}
              setSelectedDate={onChange}
            />
          )}
        />

        <MainButton
          text={isSaving ? 'Saving…' : 'Save'}
          isLoading={isSaving}
          isDisabled={isSaving || isDeleting}
          onPress={() => void onSubmit()}
        />

        {slot && (
          <MainButton
            text={isDeleting ? 'Removing…' : 'Remove this feed'}
            variant="text"
            isLoading={isDeleting}
            isDisabled={isSaving || isDeleting}
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
  const { data: slots = [], isLoading, isError, refetch } = useFeedingSchedules(petId);
  // A sitter should not be able to move dinner. A partner should -- and a
  // partner is invited as an owner, so the rule lands the right way round.
  const { data: household } = useHousehold();
  const isOwner = household?.isOwner ?? false;

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
        {isOwner && (
          <IconButton
            name="plus"
            accessibilityLabel="Add a feed time"
            variant="ghost"
            onPress={() => openEdit(null)}
          />
        )}
      </View>

      {isError ? (
        <ErrorState
          title="Couldn't load feed times"
          onRetry={() => {
            void refetch();
          }}
        />
      ) : isLoading ? (
        <ActivityIndicator />
      ) : slots.length === 0 ? (
        <AppText color="textSecondary" size={14}>
          No feed times yet. Add one to get missed-feed alerts.
        </AppText>
      ) : (
        <View style={styles.list}>
          {slots.map((slot) => (
            <View key={slot.id} style={styles.slotRow}>
              <View>
                <AppText size={16}>{capitalize(slot.label)}</AppText>
                <AppText color="textSecondary" size={14}>
                  {dayjs(slot.scheduledTime, 'HH:mm').format('h:mm A')}
                </AppText>
              </View>
              {isOwner && (
                <IconButton
                  name="pencil"
                  accessibilityLabel={`Edit ${slot.label} feed`}
                  variant="ghost"
                  size={18}
                  onPress={() => openEdit(slot)}
                />
              )}
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
      borderBottomColor: colors.border
    },
    form: { gap: spacing.three }
  });

export default ScheduleSection;
