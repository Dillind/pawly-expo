import HowFeedsWorkSheet from '@/components/bottom-sheets/how-feeds-work-sheet';
import AppText from '@/components/core/app-text';
import Divider from '@/components/core/divider';
import ErrorState from '@/components/core/error-state';
import ToggleSwitch from '@/components/core/toggle-switch';
import IconButton from '@/components/core/icon-button';
import Tray, { type TrayStepDescriptor } from '@/components/core/tray';
import FeedTimeForm from '@/components/ui/feed-time-form';
import type { AppTheme } from '@/constants/theme';
import { useFeedTimes } from '@/hooks/queries/feeding/use-feed-times';
import { useEndFeedTime, useSaveFeedTime } from '@/hooks/queries/feeding/use-feed-time-mutations';
import { usePausePet, usePetPause, useResumePet } from '@/hooks/queries/feeding/use-pet-pause';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useStyles } from '@/hooks/use-styles';
import type { FeedTime } from '@/services/feed-time.service';
import { todayInTimezone } from '@/lib/dates';
import { describeDays } from '@/utils/days';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import dayjs from 'dayjs';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

type EditStepProps = {
  petId: string;
  feedTime: FeedTime | null;
  onDone: () => void;
};

const EditStep = ({ petId, feedTime, onDone }: EditStepProps) => {
  const { mutate: saveFeedTime, isPending: isSaving } = useSaveFeedTime(petId);
  const { mutate: endFeedTime, isPending: isRemoving } = useEndFeedTime(petId);

  return (
    <FeedTimeForm
      feedTime={feedTime}
      isSaving={isSaving}
      isRemoving={isRemoving}
      onSubmit={(values) =>
        saveFeedTime({ ...values, seriesId: feedTime?.seriesId }, { onSuccess: onDone })
      }
      onRemove={
        feedTime ? () => endFeedTime(feedTime.seriesId, { onSuccess: onDone }) : undefined
      }
    />
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

  const today = household?.timezone ? todayInTimezone(household.timezone) : undefined;
  const { data: pause } = usePetPause(petId, today);
  const { mutate: pausePet, isPending: isPausing } = usePausePet(petId);
  const { mutate: resumePet, isPending: isResuming } = useResumePet(petId);
  const helpSheetRef = useRef<TrueSheet | null>(null);

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
          Feeds
        </AppText>
        <View style={styles.headerActions}>
          <IconButton
            name="help"
            accessibilityLabel="How feeds work"
            variant="ghost"
            size={18}
            onPress={() => void helpSheetRef.current?.present()}
          />
          {isOwner && (
            <IconButton
              name="plus"
              accessibilityLabel="Add a feed time"
              variant="ghost"
              onPress={() => openEdit(null)}
            />
          )}
        </View>
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
          No feeds set up yet. Add their feed times and everyone will know when they are due.
        </AppText>
      ) : (
        <View style={styles.list}>
          {feedTimes.map((feedTime) => (
            <View key={feedTime.seriesId} style={styles.feedTimeRow}>
              <View style={styles.feedTimeBody}>
                <View style={styles.feedTimeHeading}>
                  <AppText size={16} fontWeight="bold">
                    {capitalize(feedTime.label)}
                  </AppText>
                  <AppText color="textSecondary" size={14}>
                    {dayjs(feedTime.localTime, 'HH:mm').format('h:mm A')}
                  </AppText>
                </View>
                <AppText color="textSecondary" size={13}>
                  {describeDays(feedTime.daysOfWeek)}
                  {feedTime.instructions ? `  ·  ${feedTime.instructions}` : ''}
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

      {isOwner && today && (
        <>
          <Divider />

          <ToggleSwitch
            label="Pause feeds"
            description={
              pause
                ? 'No feeds expected, nobody nudged.'
                : 'Boarding, a vet stay, fasting before surgery.'
            }
            value={Boolean(pause)}
            isDisabled={isPausing || isResuming}
            onChange={(next) => (next ? pausePet(null) : resumePet())}
          />
        </>
      )}

      <Tray sheetRef={sheetRef} steps={steps} onDismiss={() => setEditingFeedTime(null)} />
      <HowFeedsWorkSheet sheetRef={helpSheetRef} />
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
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    list: { gap: spacing.two },
    feedTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      paddingVertical: spacing.two,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border
    },
    feedTimeBody: { flex: 1, gap: 2 },
    feedTimeHeading: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.two
    }
  });

export default ScheduleSection;
