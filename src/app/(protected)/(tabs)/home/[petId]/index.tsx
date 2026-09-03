import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import FeedLogDetailSheet from '@/components/bottom-sheets/feed-log-detail-sheet';
import ErrorState from '@/components/core/error-state';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import FeedTimesSection from '@/components/screens/pet/feed-times-section';
import GalleryStrip from '@/components/screens/pet/gallery-strip';
import PetBio from '@/components/screens/pet/pet-bio';
import PetDetailSkeleton from '@/components/screens/pet/pet-detail-skeleton';
import PetIdentity from '@/components/screens/pet/pet-identity';
import RemindersSection from '@/components/screens/pet/reminders-section';
import SectionCard from '@/components/screens/pet/section-card';
import { BottomTabInset, HeaderTitleStyle, ScreenGutter, type AppTheme } from '@/constants/theme';
import { usePetPause } from '@/hooks/queries/feeding/use-pet-pause';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useHouseholdMembers } from '@/hooks/queries/household/use-household-members';
import { usePetDetail } from '@/hooks/queries/pet/use-pet-detail';
import { useStyles } from '@/hooks/use-styles';
import { todayInTimezone } from '@/lib/dates';

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
  const isPaused = Boolean(pause);

  const openLog = (logId: string) => {
    setActiveLogId(logId);
    void detailSheetRef.current?.present();
  };

  // Outside every early return: behind one the bar has no title and falls back
  // to the route name.
  const title = <Stack.Title style={HeaderTitleStyle}>{pet?.name ?? ''}</Stack.Title>;

  if (!petId || isError) {
    return (
      <ScreenView edges={[]}>
        {title}
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
        {title}
        <PetDetailSkeleton />
      </ScreenView>
    );
  }

  return (
    <ScreenView edges={[]}>
      {title}

      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        {/* The photo strip runs past the right edge, so this screen opts out
            of the gutter its scroller applies and each section re-indents. */}
        <PetIdentity pet={pet} isOwner={isOwner} />

        <View style={styles.section}>
          <GalleryStrip petId={petId} />
        </View>

        <View style={styles.section}>
          <FeedTimesSection
            pet={pet}
            today={today}
            timezone={timezone}
            members={members}
            isPaused={isPaused}
            isOwner={isOwner}
            onOpenLog={openLog}
          />
        </View>

        <View style={styles.section}>
          <RemindersSection pet={pet} today={today} />
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
      paddingTop: 18,
      paddingHorizontal: ScreenGutter
    }
  });

export default PetDetail;
