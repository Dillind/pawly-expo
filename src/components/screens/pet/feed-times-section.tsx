import SheetRow from '@/components/bottom-sheets/sheet-row';
import AppText from '@/components/core/app-text';
import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import ListCard from '@/components/core/list-card';
import MainButton from '@/components/core/main-button';
import SectionLabel from '@/components/core/section-label';
import Tray, { useTray, type TrayStepDescriptor } from '@/components/core/tray';
import AddFeedTimeGhostRow from '@/components/screens/pet/add-feed-time-ghost-row';
import FeedTimeForm from '@/components/ui/feed-time-form';
import OccurrenceList from '@/components/ui/occurrence-list';
import { Radius, type AppTheme } from '@/constants/theme';
import { useFeedTimes } from '@/hooks/queries/feeding/use-feed-times';
import { useEndFeedTime, useSaveFeedTime } from '@/hooks/queries/feeding/use-feed-time-mutations';
import { useOccurrences } from '@/hooks/queries/feeding/use-occurrences';
import { useStyles } from '@/hooks/use-styles';
import { formatScheduledTime } from '@/lib/dates';
import type { FeedTime } from '@/services/feed-time.service';
import type { HouseholdMember, Occurrence, Pet } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

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
  onPickOccurrence: (occurrence: Occurrence) => void;
};

/**
 * Today's feeds for one pet, and the way into changing the schedule.
 *
 * The card shows occurrences, not Feed Times: the question on this screen is
 * what has been logged today. The schedule behind them is edited in the tray,
 * which is where a keyboard and a destructive remove belong.
 */
const FeedTimesSection = ({
  pet,
  today,
  timezone,
  members,
  isPaused,
  isOwner,
  onOpenLog,
  onPickOccurrence
}: Props) => {
  const styles = useStyles(makeStyles);
  const trayRef = useRef<TrueSheet | null>(null);
  const [editingFeedTime, setEditingFeedTime] = useState<FeedTime | null>(null);

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

  const renderCard = () => {
    // A pause is not an empty schedule. Saying "no feeds set up" to a member
    // who paused this morning reads as if the app lost their work.
    if (isPaused) {
      return (
        <View style={styles.pausedCard}>
          <AppText size={15}>Paused — no feeds expected</AppText>
          <AppText size={13} color="textSecondary">
            {pet.name} is paused. No feeds are expected and nobody is nudged.
          </AppText>
        </View>
      );
    }

    if (isError) {
      return (
        <ErrorState
          title="Couldn't load feed times"
          onRetry={() => {
            void refetch();
          }}
        />
      );
    }

    if (isLoading || !occurrences) return <ActivityIndicator />;

    if (occurrences.length === 0) {
      return (
        <View style={styles.empty}>
          <EmptyState
            icon="clock"
            title={feedTimes.length > 0 ? 'No feeds today' : 'No feed times yet'}
            description={
              feedTimes.length > 0
                ? `Nothing is due for ${pet.name} today. Their next feed is on the way.`
                : `Add ${pet.name}'s feed times and everyone will know when they are due.`
            }
          />
          {isOwner && feedTimes.length === 0 && (
            <MainButton
              text="Add a feed time"
              variant="secondary"
              onPress={() => void trayRef.current?.present()}
            />
          )}
        </View>
      );
    }

    return (
      <ListCard>
        <View style={styles.rows}>
          <OccurrenceList
            occurrences={occurrences}
            timezone={timezone}
            members={members}
            isNested
            hasDividers
            onOpenLog={onOpenLog}
            onPickOccurrence={onPickOccurrence}
          />
        </View>
      </ListCard>
    );
  };

  return (
    <View style={styles.section}>
      <SectionLabel
        action={
          isOwner ? (
            <MainButton
              text="Edit"
              variant="secondary"
              size="xs"
              containerStyle={styles.editButton}
              onPress={() => void trayRef.current?.present()}
            />
          ) : undefined
        }>
        Feed times
      </SectionLabel>

      {renderCard()}

      <Tray sheetRef={trayRef} steps={steps} onDismiss={() => setEditingFeedTime(null)} />
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    section: { gap: spacing.two },
    // MainButton stretches by default, which in a label row means it fills the
    // row's height. Edit is a chip, not a bar.
    editButton: { alignSelf: 'center' },
    rows: { paddingHorizontal: spacing.three, paddingVertical: spacing.one },
    pausedCard: {
      gap: spacing.half,
      padding: spacing.three,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundSelected
    },
    empty: { gap: spacing.two },
    trayRows: { gap: spacing.two }
  });

export default FeedTimesSection;
