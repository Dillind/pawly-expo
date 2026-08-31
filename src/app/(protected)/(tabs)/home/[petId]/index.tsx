import FeedLogDetailSheet from '@/components/bottom-sheets/feed-log-detail-sheet';
import ErrorState from '@/components/core/error-state';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import CareCard from '@/components/screens/pet/care-card';
import FeedTimesSection from '@/components/screens/pet/feed-times-section';
import GalleryStrip from '@/components/screens/pet/gallery-strip';
import PauseCard from '@/components/screens/pet/pause-card';
import PetBio from '@/components/screens/pet/pet-bio';
import PetDetailSkeleton from '@/components/screens/pet/pet-detail-skeleton';
import PetIdentity from '@/components/screens/pet/pet-identity';
import SectionCard from '@/components/screens/pet/section-card';
import { BottomTabInset, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useFeedTimes } from '@/hooks/queries/feeding/use-feed-times';
import { useOccurrences } from '@/hooks/queries/feeding/use-occurrences';
import { usePetPause } from '@/hooks/queries/feeding/use-pet-pause';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useHouseholdMembers } from '@/hooks/queries/household/use-household-members';
import { usePetDetail } from '@/hooks/queries/pet/use-pet-detail';
import { useLogFlow } from '@/hooks/use-log-flow';
import { useStyles } from '@/hooks/use-styles';
import { todayInTimezone } from '@/lib/dates';
import { summarisePetDay } from '@/utils/pet-status';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

const PetDetail = () => {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const styles = useStyles(makeStyles);

  const [activeLogId, setActiveLogId] = useState<string | undefined>(undefined);
  const detailSheetRef = useRef<TrueSheet | null>(null);

  const { data: pet, isLoading, isError, refetch } = usePetDetail(petId);
  const { data: household } = useHousehold();
  const { data: members = [] } = useHouseholdMembers();

  const isOwner = household?.isOwner ?? false;
  const timezone = household?.timezone;
  const today = timezone ? todayInTimezone(timezone) : undefined;

  const { data: pause } = usePetPause(petId, today);
  const { data: occurrences } = useOccurrences(petId, today);
  const { data: feedTimes = [] } = useFeedTimes(petId);
  const isPaused = Boolean(pause);

  const flow = useLogFlow({
    members,
    timezone,
    onWritten: () => undefined
  });

  const openLog = (logId: string) => {
    setActiveLogId(logId);
    void detailSheetRef.current?.present();
  };

  if (!petId || isError) {
    return (
      <ScreenView edges={[]}>
        <ErrorState
          onRetry={() => {
            void refetch();
          }}
        />
      </ScreenView>
    );
  }

  if (isLoading || !pet || !timezone || !today) {
    return (
      <ScreenView edges={[]}>
        <PetDetailSkeleton />
      </ScreenView>
    );
  }

  const summary = occurrences
    ? [
        feedTimes.length > 0
          ? `${feedTimes.length} feed ${feedTimes.length === 1 ? 'time' : 'times'} a day`
          : null,
        summarisePetDay(occurrences, isPaused, feedTimes.length > 0)
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never">
        {/* The photo runs to the edge, so this screen opts out of the gutter
            its scroller applies and each section re-indents itself. */}
        <PetIdentity pet={pet} isOwner={isOwner} summary={summary} />

        <View style={styles.section}>
          <FeedTimesSection
            pet={pet}
            today={today}
            timezone={timezone}
            members={members}
            isPaused={isPaused}
            isOwner={isOwner}
            onOpenLog={openLog}
            onPickOccurrence={(occurrence) => flow.pickOccurrence(pet, occurrence)}
          />
        </View>

        {isOwner && (
          <View style={styles.section}>
            <PauseCard petId={petId} isPaused={isPaused} />
          </View>
        )}

        <View style={styles.section}>
          <CareCard
            petId={petId}
            petName={pet.name}
            petSubtitle={pet.breed}
            photoUrl={pet.photoUrl}
          />
        </View>

        <View style={styles.section}>
          <GalleryStrip petId={petId} />
        </View>

        <View style={styles.section}>
          <SectionCard>
            <PetBio petId={petId} name={pet.name} bio={pet.bio} />
          </SectionCard>
        </View>
      </ScreenScrollView>

      <FeedLogDetailSheet sheetRef={detailSheetRef} logId={activeLogId} petId={petId} />
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingHorizontal: 0,
      paddingBottom: BottomTabInset + spacing.four
    },
    section: {
      paddingTop: 14,
      paddingHorizontal: ScreenGutter
    }
  });

export default PetDetail;
