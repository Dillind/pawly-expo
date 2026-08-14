import FeedLogDetailSheet from '@/components/bottom-sheets/feed-log-detail-sheet';
import LogFeedTray from '@/components/bottom-sheets/log-feed-tray';
import AppText from '@/components/core/app-text';
import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import MainButton from '@/components/core/main-button';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import NoHouseholdState from '@/components/screens/home/no-household-state';
import PetSection from '@/components/screens/home/pet-section';
import NotificationBell from '@/components/screens/notifications/notification-bell';
import ActionPopover from '@/components/ui/action-popover';
import HouseholdSwitcher from '@/components/ui/household-switcher';
import TileGrid from '@/components/ui/tile-grid';
import { CREATE_ACTIONS } from '@/constants/create-actions';
import { HOME_TILES } from '@/constants/home-tiles';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/use-household';
import { useHouseholds } from '@/hooks/queries/use-households';
import { useHouseholdMembers } from '@/hooks/queries/use-household-members';
import { usePets } from '@/hooks/queries/use-pets';
import { useLogFlow } from '@/hooks/use-log-flow';
import { useRequestNotificationPermission } from '@/hooks/use-notification-permission';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useStyles } from '@/hooks/use-styles';
import { formatDayAndDate, todayInTimezone } from '@/lib/dates';
import type { Pet } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

const Home = () => {
  const [activeLogId, setActiveLogId] = useState<string | undefined>(undefined);
  const [activePetId, setActivePetId] = useState<string | undefined>(undefined);
  const [logPet, setLogPet] = useState<Pet | undefined>(undefined);
  const styles = useStyles(makeStyles);

  const { data: household } = useHousehold();
  const { data: households = [], isLoading: isLoadingHouseholds } = useHouseholds();
  const { data: pets = [], isLoading, isError, refetch } = usePets();
  const { data: members = [] } = useHouseholdMembers();

  const timezone = household?.timezone;
  const today = timezone ? todayInTimezone(timezone) : undefined;

  useRefreshOnFocus(['slot-states']);
  const detailSheetRef = useRef<TrueSheet | null>(null);
  const logTrayRef = useRef<TrueSheet | null>(null);
  const hasCheckedPermission = useRef(false);
  const requestPermission = useRequestNotificationPermission();

  const flow = useLogFlow({
    members,
    timezone,
    onConfirmNeeded: () => {
      void logTrayRef.current?.present();
    },
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
    // No household at all is a valid, permanent state -- the sitter with no
    // pets of their own. It gets the two doors, not the "no pets" empty state.
    if (!isLoadingHouseholds && households.length === 0) return <NoHouseholdState />;

    if (isError) {
      return (
        <ErrorState
          onRetry={() => {
            void refetch();
          }}
        />
      );
    }

    if (isLoading || !timezone || !today) return <ActivityIndicator />;

    if (!hasPets) {
      return (
        <EmptyState
          icon="pawPrint"
          title="No pets yet"
          description="Add a pet to start tracking feeds."
          action={<MainButton text="Add a pet" href="/home/add-pet" />}
        />
      );
    }

    return (
      // Animated so the sections below an expanding one slide rather than jump.
      <Animated.View style={styles.sections} layout={LinearTransition.duration(220)}>
        {pets.map((pet) => (
          <PetSection
            key={pet.id}
            pet={pet}
            timezone={timezone}
            today={today}
            members={members}
            isOnlyPet={isOnlyPet}
            onOpenLog={(logId) => openLog(logId, pet.id)}
            // Named before the pick so that if a confirm follows, backing out
            // of it lands on this pet's list rather than the pet picker.
            onPickSlot={(pickedPet, slot) => {
              setLogPet(pickedPet);
              flow.pickSlot(pickedPet, slot);
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
    <ScreenView>
      <ScreenScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <HouseholdSwitcher />
          {hasHousehold && <NotificationBell householdId={household?.id} />}
        </View>

        {timezone && hasHousehold && (
          <AppText size={14} color="textSecondary">
            {formatDayAndDate(new Date(), timezone)}
          </AppText>
        )}

        {hasPets && (
          <AppText variant="header" size={32}>
            Today
          </AppText>
        )}

        {renderBody()}

        {hasHousehold && <TileGrid tiles={HOME_TILES} />}
      </ScreenScrollView>

      {/* Nothing in it applies before a household exists, and the two doors
          above are already the only two things to do. */}
      {hasHousehold && (
        <ActionPopover
          actions={CREATE_ACTIONS}
          primaryAction={{
            label: 'Log a feed',
            icon: 'utensils',
            isDisabled: !hasPets,
            onPress: () => {
              setLogPet(undefined);
              void logTrayRef.current?.present();
            }
          }}
        />
      )}

      {timezone && today && (
        <LogFeedTray
          sheetRef={logTrayRef}
          pets={pets}
          timezone={timezone}
          today={today}
          members={members}
          pet={logPet}
          flow={flow}
          onOpenLog={(logId) => openLog(logId, logPet?.id ?? pets[0]?.id)}
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
      paddingTop: spacing.four,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.three
    },
    sections: {
      gap: spacing.four
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.two
    }
  });

export default Home;
