import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import SheetRow from '@/components/bottom-sheets/sheet-row';
import AppText from '@/components/core/app-text';
import Divider, { RowInset } from '@/components/core/divider';
import ErrorState from '@/components/core/error-state';
import IconButton from '@/components/core/icon-button';
import ListCard from '@/components/core/list-card';
import ToggleSwitch from '@/components/core/toggle-switch';
import Tray, { useTray, type TrayStepDescriptor } from '@/components/core/tray';
import AddFeedTimeGhostRow from '@/components/screens/pet/add-feed-time-ghost-row';
import FeedTimeForm from '@/components/ui/feed-time-form';
import OccurrenceList from '@/components/ui/occurrence-list';
import type { AppTheme } from '@/constants/theme';
import { useEndFeedTime, useSaveFeedTime } from '@/hooks/queries/feeding/use-feed-time-mutations';
import { useFeedTimes } from '@/hooks/queries/feeding/use-feed-times';
import { useOccurrences } from '@/hooks/queries/feeding/use-occurrences';
import { usePausePet, useResumePet } from '@/hooks/queries/feeding/use-pet-pause';
import { useStyles } from '@/hooks/use-styles';
import { formatScheduledTime } from '@/lib/dates';
import type { FeedTime } from '@/services/feed-time.service';
import type { HouseholdMember, Pet } from '@/types/core';

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

// A Contributor has no plus to tap, so the line must not ask them to add one.
const emptyCopy = (petName: string, hasSchedule: boolean, isOwner: boolean) => {
  if (hasSchedule) return `Nothing is due for ${petName} today. Their next feed is on the way.`;
  return isOwner
    ? `No feed times yet. Add ${petName}'s feed times and everyone will know when they are due.`
    : `No feed times yet. An owner sets ${petName}'s feed times.`;
};

type ListStepProps = {
  feedTimes: FeedTime[];
  onPick: (feedTime: FeedTime | null) => void;
};

/** Step 1: the schedule itself. Every row leads to the same second step. */
const ListStep = ({ feedTimes, onPick }: ListStepProps) => {
  const styles = useStyles(makeStyles);
  const { goTo } = useTray();

  const open = (feedTime: FeedTime | null) => {
    onPick(feedTime);
    goTo('edit');
  };

  return (
    <View style={styles.trayRows}>
      {feedTimes.map((feedTime) => (
        <SheetRow
          key={feedTime.seriesId}
          label={capitalise(feedTime.label)}
          detail={formatScheduledTime(feedTime.localTime)}
          onPress={() => open(feedTime)}
        />
      ))}

      <AddFeedTimeGhostRow onPress={() => open(null)} />

      <AppText size={13} color="textSecondary">
        Everyone in the household is nudged at these times.
      </AppText>
    </View>
  );
};

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
      onRemove={feedTime ? () => endFeedTime(feedTime.seriesId, { onSuccess: onDone }) : undefined}
    />
  );
};

type Props = {
  pet: Pet;
  /** The household's today, as YYYY-MM-DD. */
  today: string;
  timezone: string;
  members: HouseholdMember[];
  isPaused: boolean;
  isOwner: boolean;
  onOpenLog: (logId: string) => void;
};

/**
 * Today's feeds for one pet, and the way into changing the schedule.
 *
 * The card shows occurrences, not Feed Times: the question on this screen is
 * what has been logged today. The schedule behind them is edited in the tray,
 * which is where a keyboard and a destructive remove belong.
 *
 * Pause is the last row of the same card rather than a card of its own. It
 * answers the question the rows above raise -- why nothing is due -- and a
 * separate card put that answer somewhere the reader had already left.
 */
const FeedTimesSection = ({
  pet,
  today,
  timezone,
  members,
  isPaused,
  isOwner,
  onOpenLog
}: Props) => {
  const styles = useStyles(makeStyles);
  const trayRef = useRef<TrueSheet | null>(null);
  const [editingFeedTime, setEditingFeedTime] = useState<FeedTime | null>(null);
  const [initialStepId, setInitialStepId] = useState<'list' | 'edit'>('list');

  const { mutate: pausePet, isPending: isPausing } = usePausePet(pet.id);
  const { mutate: resumePet, isPending: isResuming } = useResumePet(pet.id);

  const openTray = (stepId: 'list' | 'edit') => {
    setEditingFeedTime(null);
    setInitialStepId(stepId);
    void trayRef.current?.present();
  };

  const {
    data: occurrences,
    isLoading,
    isError,
    refetch
  } = useOccurrences(pet.id, today, {
    live: true
  });
  const { data: feedTimes = [] } = useFeedTimes(pet.id);

  const steps: TrayStepDescriptor[] = [
    {
      id: 'list',
      title: 'Feed times',
      render: () => <ListStep feedTimes={feedTimes} onPick={setEditingFeedTime} />
    },
    {
      id: 'edit',
      title: editingFeedTime ? `Edit ${capitalise(editingFeedTime.label)} feed` : 'Add a feed time',
      render: () => (
        <EditStep
          petId={pet.id}
          feedTime={editingFeedTime}
          onDone={() => void trayRef.current?.dismiss()}
        />
      )
    }
  ];

  const renderBody = () => {
    // A pause is not an empty schedule. Saying "no feeds set up" to a member
    // who paused this morning reads as if the app lost their work.
    if (isPaused) {
      return (
        <View style={styles.pausedBlock}>
          <AppText size={15}>Paused — no feeds expected</AppText>
          <AppText size={13} color="textSecondary">
            {pet.name} is paused. No feeds are expected and nobody is nudged.
          </AppText>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.block}>
          <ErrorState
            title="Couldn't load feed times"
            onRetry={() => {
              void refetch();
            }}
          />
        </View>
      );
    }

    if (isLoading || !occurrences) {
      return (
        <View style={styles.block}>
          <ActivityIndicator />
        </View>
      );
    }

    // One quiet line, not an EmptyState: the card's header already carries the
    // plus.
    if (occurrences.length === 0) {
      return (
        <View style={styles.block}>
          <AppText size={13} color="textSecondary">
            {emptyCopy(pet.name, feedTimes.length > 0, isOwner)}
          </AppText>
        </View>
      );
    }

    return (
      <View style={styles.rows}>
        <OccurrenceList
          occurrences={occurrences}
          timezone={timezone}
          members={members}
          isNested
          hasDividers
          onOpenLog={onOpenLog}
        />
      </View>
    );
  };

  return (
    <>
      <ListCard>
        <View style={styles.header}>
          <AppText variant="header" size={17} fontWeight="bold" style={styles.headerTitle}>
            Feed times
          </AppText>

          {isOwner && (
            <>
              <IconButton
                name="pencil"
                accessibilityLabel="Edit feed times"
                variant="ghost"
                size={20}
                onPress={() => openTray('list')}
              />
              <IconButton
                name="plus"
                accessibilityLabel="Add a feed time"
                variant="ghost"
                size={22}
                onPress={() => openTray('edit')}
              />
            </>
          )}
        </View>

        <Divider inset={RowInset} />

        {renderBody()}

        {isOwner && (
          <>
            <Divider inset={RowInset} />
            <View style={styles.block}>
              <ToggleSwitch
                label="Pause feeds"
                description="Boarding, a vet stay, fasting before surgery."
                value={isPaused}
                isDisabled={isPausing || isResuming}
                onChange={(next) => (next ? pausePet(null) : resumePet())}
              />
            </View>
          </>
        )}
      </ListCard>

      <Tray
        sheetRef={trayRef}
        steps={steps}
        initialStepId={initialStepId}
        onDismiss={() => setEditingFeedTime(null)}
      />
    </>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.half,
      paddingLeft: spacing.three,
      paddingRight: spacing.two,
      paddingVertical: spacing.two
    },
    headerTitle: {
      flex: 1
    },
    rows: {
      paddingHorizontal: spacing.three,
      paddingVertical: spacing.one
    },
    block: {
      padding: spacing.three
    },
    pausedBlock: {
      gap: spacing.half,
      padding: spacing.three,
      backgroundColor: colors.backgroundSelected
    },
    trayRows: {
      gap: spacing.two
    }
  });

export default FeedTimesSection;
