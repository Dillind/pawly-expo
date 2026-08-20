import AppText from '@/components/core/app-text';
import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import DropdownPickerValidated from '@/components/core/dropdown-picker-validated';
import ErrorState from '@/components/core/error-state';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import Tray, { type TrayStepDescriptor } from '@/components/core/tray';
import { FEEDING_SCHEDULE_LABEL_OPTIONS } from '@/constants/options';
import type { AppTheme } from '@/constants/theme';
import { useFeedTimes } from '@/hooks/queries/feeding/use-feed-times';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useEndFeedTime, useSaveFeedTime } from '@/hooks/queries/feeding/use-feed-time-mutations';
import { useStyles } from '@/hooks/use-styles';
import { EVERY_DAY, feedTimeSchema, type FeedTimeInput } from '@/lib/form/pet-schemas';
import type { FeedTime } from '@/services/feed-time.service';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import dayjs from 'dayjs';
import { useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

type EditStepProps = {
  petId: string;
  feedTime: FeedTime | null;
  onDone: () => void;
};

const EditStep = ({ petId, feedTime, onDone }: EditStepProps) => {
  const styles = useStyles(makeStyles);
  const { mutate: saveFeedTime, isPending: isSaving } = useSaveFeedTime(petId);
  const { mutate: endFeedTime, isPending: isDeleting } = useEndFeedTime(petId);

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

  const onSubmit = handleSubmit((values) => {
    saveFeedTime({ ...values, seriesId: feedTime?.seriesId }, { onSuccess: onDone });
  });

  const onDelete = () => {
    if (!feedTime) return;

    endFeedTime(feedTime.seriesId, { onSuccess: onDone });
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
          name="localTime"
          render={({ field: { onChange } }) => (
            <DateTimePickerValidated
              name="localTime"
              mode="time"
              label="Time fed"
              selectedDate={localTime}
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

        {feedTime && (
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
  const [editingFeedTime, setEditingFeedTime] = useState<FeedTime | null>(null);
  const { data: feedTimes = [], isLoading, isError, refetch } = useFeedTimes(petId);
  // A sitter should not be able to move dinner. A partner should -- and a
  // partner is invited as an owner, so the rule lands the right way round.
  const { data: household } = useHousehold();
  const isOwner = household?.isOwner ?? false;

  const openEdit = (next: FeedTime | null) => {
    setEditingFeedTime(next);
    void sheetRef.current?.present();
  };

  const steps: TrayStepDescriptor[] = [
    {
      id: 'edit',
      title: editingFeedTime ? `Edit ${capitalize(editingFeedTime.label)} feed` : 'Add a feed time',
      render: () => (
        <EditStep
          petId={petId}
          feedTime={editingFeedTime}
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
      ) : feedTimes.length === 0 ? (
        <AppText color="textSecondary" size={14}>
          No feed times yet. Add one to get missed-feed alerts.
        </AppText>
      ) : (
        <View style={styles.list}>
          {feedTimes.map((feedTime) => (
            <View key={feedTime.seriesId} style={styles.feedTimeRow}>
              <View>
                <AppText size={16}>{capitalize(feedTime.label)}</AppText>
                <AppText color="textSecondary" size={14}>
                  {dayjs(feedTime.localTime, 'HH:mm').format('h:mm A')}
                </AppText>
              </View>
              {isOwner && (
                <IconButton
                  name="pencil"
                  accessibilityLabel={`Edit ${feedTime.label} feed`}
                  variant="ghost"
                  size={18}
                  onPress={() => openEdit(feedTime)}
                />
              )}
            </View>
          ))}
        </View>
      )}

      <Tray sheetRef={sheetRef} steps={steps} onDismiss={() => setEditingFeedTime(null)} />
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
    feedTimeRow: {
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
