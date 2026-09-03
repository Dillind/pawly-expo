import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import BaseSheet from '@/components/bottom-sheets/base-sheet';
import SheetRow from '@/components/bottom-sheets/sheet-row';
import AppText from '@/components/core/app-text';
import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import DayOfWeekPicker from '@/components/ui/day-of-week-picker';
import { FEEDING_SCHEDULE_LABEL_OPTIONS } from '@/constants/options';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { EVERY_DAY, feedTimeSchema, type FeedTimeInput } from '@/lib/form/pet-schemas';
import type { FeedTime } from '@/services/feed-time.service';
import type { FeedingScheduleLabel } from '@/types/core';
import { optionLabel } from '@/utils/options';

type Props = {
  feedTime: FeedTime | null;
  isSaving: boolean;
  isRemoving?: boolean;
  onSubmit: (values: FeedTimeInput) => void;
  onRemove?: () => void;
};

/**
 * One feed's whole definition — which feed, what time, which days, what the pet
 * gets. Shared by the pet screen, where it is raised as a sheet, and the
 * add-pet flow, where it is a pushed screen. Same content either way, which is
 * why the form owns no presentation.
 */
const FeedTimeForm = ({ feedTime, isSaving, isRemoving = false, onSubmit, onRemove }: Props) => {
  const styles = useStyles(makeStyles);
  const labelSheetRef = useRef<TrueSheet | null>(null);

  const form = useForm<FeedTimeInput>({
    resolver: zodResolver(feedTimeSchema),
    defaultValues: {
      label: feedTime?.label ?? 'custom',
      localTime: feedTime?.localTime ?? '17:00',
      daysOfWeek: feedTime?.daysOfWeek ?? [...EVERY_DAY],
      instructions: feedTime?.instructions ?? null
    }
  });
  const { control, handleSubmit } = form;

  const localTime = useWatch({ control, name: 'localTime' });
  const isBusy = isSaving || isRemoving;

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <FormProvider {...form}>
      <View style={styles.form}>
        <Controller
          control={control}
          name="label"
          render={({ field: { onChange, value } }) => (
            <>
              <View style={styles.field}>
                <AppText size={14} fontWeight="bold">
                  Feed
                </AppText>
                <PressableOpacity
                  style={styles.picker}
                  accessibilityRole="button"
                  accessibilityLabel={`Feed: ${optionLabel(FEEDING_SCHEDULE_LABEL_OPTIONS, value)}`}
                  onPress={() => void labelSheetRef.current?.present()}>
                  <AppText size={16} style={styles.pickerValue}>
                    {optionLabel(FEEDING_SCHEDULE_LABEL_OPTIONS, value)}
                  </AppText>
                  <Icon name="caretRight" size={16} color="textSecondary" />
                </PressableOpacity>
              </View>

              <BaseSheet sheetRef={labelSheetRef} title="Which feed?" detents={['auto']}>
                <View style={styles.rows}>
                  {FEEDING_SCHEDULE_LABEL_OPTIONS.map((option) => (
                    <SheetRow
                      key={option.value}
                      label={option.label}
                      isSelected={option.value === value}
                      onPress={() => {
                        onChange(option.value as FeedingScheduleLabel);
                        void labelSheetRef.current?.dismiss();
                      }}
                    />
                  ))}
                </View>
              </BaseSheet>
            </>
          )}
        />

        <Controller
          control={control}
          name="localTime"
          render={({ field: { onChange } }) => (
            <DateTimePickerValidated
              name="localTime"
              mode="time"
              label="Time"
              isLabelIndicated
              selectedDate={localTime}
              setSelectedDate={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="daysOfWeek"
          render={({ field: { onChange, value } }) => (
            <DayOfWeekPicker name="daysOfWeek" value={value} onChange={onChange} />
          )}
        />

        <Controller
          control={control}
          name="instructions"
          render={({ field: { onChange, value } }) => (
            <TextInputValidated
              name="instructions"
              label="Instructions"
              placeholder="Half a tin of wet food + 1 cup dry"
              value={value ?? ''}
              onChangeText={(next: string) => onChange(next === '' ? null : next)}
              isMultiline
            />
          )}
        />

        <AppText size={13} color="textSecondary">
          Whoever feeds them sees this when they log it. Changes start tomorrow — days already gone
          keep the times they had.
        </AppText>

        <MainButton
          text={isSaving ? 'Saving…' : 'Save'}
          isLoading={isSaving}
          isDisabled={isBusy}
          onPress={() => void submit()}
        />

        {feedTime && onRemove && (
          <MainButton
            text={isRemoving ? 'Removing…' : 'Remove this feed'}
            variant="text"
            isLoading={isRemoving}
            isDisabled={isBusy}
            onPress={onRemove}
          />
        )}
      </View>
    </FormProvider>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    form: {
      gap: spacing.three
    },
    field: {
      gap: spacing.two
    },
    rows: {
      gap: spacing.two
    },
    picker: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border
    },
    pickerValue: {
      flex: 1
    }
  });

export default FeedTimeForm;
