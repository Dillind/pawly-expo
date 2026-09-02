import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import FeedLogDetailSheet from '@/components/bottom-sheets/feed-log-detail-sheet';
import LogFeedTray from '@/components/bottom-sheets/log-feed-tray';
import AppText from '@/components/core/app-text';
import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import MainButton from '@/components/core/main-button';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import DayBanner from '@/components/screens/home/day-banner';
import HomeTip from '@/components/screens/home/home-tip';
import MonthPopover from '@/components/screens/home/month-popover';
import NoHouseholdState from '@/components/screens/home/no-household-state';
import PetSection from '@/components/screens/home/pet-section';
import PetSectionSkeleton from '@/components/screens/home/pet-section-skeleton';
import WeekStrip from '@/components/screens/home/week-strip';
import TileGrid from '@/components/ui/tile-grid';
import { HOME_TILES } from '@/constants/home-tiles';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useUserProfile } from '@/hooks/queries/account/use-user-profile';
import { useRefreshUnreadAlertCount } from '@/hooks/queries/alerts/use-alerts';
import { useHouseholdFeedTimes } from '@/hooks/queries/feeding/use-household-feed-times';
import { useHouseholdOccurrences } from '@/hooks/queries/feeding/use-household-occurrences';
import { useRefreshOccurrences } from '@/hooks/queries/feeding/use-occurrences';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useHouseholdMembers } from '@/hooks/queries/household/use-household-members';
import { useHouseholds } from '@/hooks/queries/household/use-households';
import { usePets } from '@/hooks/queries/pet/use-pets';
import { useReminderDays } from '@/hooks/queries/reminder/use-reminders';
import { useLogFlow } from '@/hooks/use-log-flow';
import { useRequestNotificationPermission } from '@/hooks/use-notification-permission';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useStyles } from '@/hooks/use-styles';
import { formatWeekdayName, todayInTimezone, weekOf } from '@/lib/dates';
import type { Pet } from '@/types/core';
import { describeDay } from '@/utils/day-summary';
import { findHomeTip } from '@/utils/home-tip';

const Home = () => {
  const [activeLogId, setActiveLogId] = useState<string | undefined>(undefined);
  const [activePetId, setActivePetId] = useState<string | undefined>(undefined);
  const [logPet, setLogPet] = useState<Pet | undefined>(undefined);
  const styles = useStyles(makeStyles);

  const { data: household } = useHousehold();
  const { data: households = [], isLoading: isLoadingHouseholds } = useHouseholds();
  const { data: pets = [], isLoading, isError, refetch } = usePets();
  const { data: members = [] } = useHouseholdMembers();

  const refreshOccurrences = useRefreshOccurrences();
  const refreshUnread = useRefreshUnreadAlertCount(household?.id);

  // The rows come from pets, the day's counts from occurrences, and the bell
  // from a third query. Refreshing one leaves the other two stale on screen.
  const { isRefreshing, onRefresh } = usePullToRefresh([
    refetch,
    refreshOccurrences,
    refreshUnread
  ]);

  const { data: profile } = useUserProfile();

  const timezone = household?.timezone;
  const today = timezone ? todayInTimezone(timezone) : undefined;

  // The day the strip is showing, which is today until someone taps another
  // cell. Held as a string rather than a Date: it is the occurrence query's
  // cache key, and a Date re-serialises every render.
  const [pickedDay, setPickedDay] = useState<string | undefined>(undefined);
  const day = pickedDay ?? today;

  // The strip only ever draws the selected day's week, so the dots ask for
  // exactly that week and refetch when it pages.
  const week = day ? weekOf(day) : undefined;
  const { data: reminderKinds } = useReminderDays(household?.id, week?.at(0), week?.at(-1));

  const occurrences = useHouseholdOccurrences(pets, day);
  const feedTimes = useHouseholdFeedTimes(pets);
  const isOwner = household?.isOwner ?? false;
  const tip = findHomeTip(pets, feedTimes, isOwner);

  useRefreshOnFocus(['occurrences']);
  const detailSheetRef = useRef<TrueSheet | null>(null);
  const logTrayRef = useRef<TrueSheet | null>(null);
  const hasCheckedPermission = useRef(false);
  const requestPermission = useRequestNotificationPermission();

  const flow = useLogFlow({
    members,
    timezone,
    onWritten: () => {
      void logTrayRef.current?.dismiss();
    }
  });

  const openLog = (logId: string, petId: string) => {
    setActiveLogId(logId);
    setActivePetId(petId);
    void detailSheetRef.current?.present();
  };

  const hasHousehold = households.length > 0;
  const hasPets = pets.length > 0;
  // No household at all is a valid, permanent state -- the sitter with no pets
  // of their own. It gets the two doors, not a loading state.
  const hasNoHousehold = !isLoadingHouseholds && households.length === 0;
  const isPending = !hasNoHousehold && (isLoading || !timezone || !today);
  const isOnlyPet = pets.length === 1;

  useEffect(() => {
    if (!hasPets || hasCheckedPermission.current) return;
    hasCheckedPermission.current = true;

    const maybeRequest = async () => {
      const permissions = await Notifications.getPermissionsAsync();

      if (permissions.status !== Notifications.PermissionStatus.UNDETERMINED) return;

      await requestPermission();
    };

    void maybeRequest();
  }, [hasPets, requestPermission]);

  const renderBody = () => {
    if (hasNoHousehold) return <NoHouseholdState />;

    if (isError) {
      return (
        <ErrorState
          onRetry={() => {
            void refetch();
          }}
        />
      );
    }

    if (isPending || !timezone || !today || !day) {
      return (
        <View style={styles.sections}>
          <PetSectionSkeleton />
          <PetSectionSkeleton />
        </View>
      );
    }

    if (!hasPets) {
      return (
        <EmptyState
          icon="pawPrint"
          title={isOwner ? 'Add your first pet' : 'Nothing to feed yet'}
          description={
            isOwner
              ? 'Their feed times go in once, and everyone in the household sees them.'
              : `No one has added a pet to ${household?.name ?? 'this household'} yet. The owner will.`
          }
          action={isOwner ? <MainButton text="Add a pet" href="/home/add-pet" /> : undefined}
        />
      );
    }

    return (
      <Animated.View
        key={day}
        style={styles.sections}
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(180)}
        layout={LinearTransition.duration(220)}>
        {pets.map((pet) => (
          <PetSection
            key={pet.id}
            pet={pet}
            timezone={timezone}
            day={day}
            members={members}
            isOnlyPet={isOnlyPet}
            isOwner={isOwner}
            onOpenLog={(logId) => openLog(logId, pet.id)}

            onPickOccurrence={(pickedPet, occurrence) => {
              setLogPet(pickedPet);
              flow.pickOccurrence(pickedPet, occurrence);
            }}
            onLogPress={() => {
              setLogPet(pet);
              void logTrayRef.current?.present();
            }}
          />
        ))}
      </Animated.View>
    );
  };

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}>
        {hasHousehold && day && today && (
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <AppText variant="header" size={34} fontWeight="bold" style={styles.heading}>
                {formatWeekdayName(day)}
              </AppText>
              <MonthPopover selectedDay={day} onSelectDay={setPickedDay} />
            </View>
            <WeekStrip
              selectedDay={day}
              today={today}
              reminderKinds={reminderKinds}
              onSelectDay={setPickedDay}
            />
          </View>
        )}

        {hasHousehold && timezone && day && (
          <DayBanner
            name={profile?.firstName ?? 'there'}
            status={describeDay(occurrences, day === today)}
            timezone={timezone}
          />
        )}

        {renderBody()}

        {hasHousehold && <TileGrid tiles={HOME_TILES} />}

        {tip && <HomeTip tip={tip} />}
      </ScreenScrollView>

      {timezone && today && (
        <LogFeedTray
          sheetRef={logTrayRef}
          pets={pets}
          today={today}
          timezone={timezone}
          pet={logPet}
          flow={flow}
        />
      )}

      <FeedLogDetailSheet sheetRef={detailSheetRef} logId={activeLogId} petId={activePetId} />
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.three
    },
    sections: {
      gap: spacing.four
    },
    header: {
      gap: spacing.two + spacing.one
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between'
    },
    heading: {
      letterSpacing: -0.6
    }
  });

export default Home;
