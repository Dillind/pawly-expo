import FeedLogDetailSheet from '@/components/bottom-sheets/feed-log-detail-sheet';
import LogFeedSheet from '@/components/bottom-sheets/log-feed-sheet';
import AppText from '@/components/core/app-text';
import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import MainButton from '@/components/core/main-button';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import PetSection from '@/components/screens/home/pet-section';
import ActionPopover from '@/components/ui/action-popover';
import { CREATE_ACTIONS } from '@/components/ui/create-actions';
import { HOME_TILES } from '@/components/ui/home-tiles';
import TileGrid from '@/components/ui/tile-grid';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/use-household';
import { useHouseholdMembers } from '@/hooks/queries/use-household-members';
import { usePets } from '@/hooks/queries/use-pets';
import { useRequestNotificationPermission } from '@/hooks/use-notification-permission';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useStyles } from '@/hooks/use-styles';
import { formatDayAndDate, todayInTimezone } from '@/lib/dates';
import type { Pet } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const Home = () => {
  const [activeLogId, setActiveLogId] = useState<string | undefined>(undefined);
  const [activePetId, setActivePetId] = useState<string | undefined>(undefined);
  const [logPet, setLogPet] = useState<Pet | undefined>(undefined);
  const styles = useStyles(makeStyles);

  const { data: household } = useHousehold();
  const { data: pets = [], isLoading, isError, refetch } = usePets();
  const { data: members = [] } = useHouseholdMembers();

  const timezone = household?.timezone;
  const today = timezone ? todayInTimezone(timezone) : undefined;

  useRefreshOnFocus(['slot-states']);
  const detailSheetRef = useRef<TrueSheet | null>(null);
  const logSheetRef = useRef<TrueSheet | null>(null);
  const hasCheckedPermission = useRef(false);
  const requestPermission = useRequestNotificationPermission();

  const hasPets = pets.length > 0;
  const isOnlyPet = pets.length === 1;

  const popoverPet = isOnlyPet ? pets[0] : undefined;

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
      <View style={styles.sections}>
        {pets.map((pet) => (
          <PetSection
            key={pet.id}
            pet={pet}
            timezone={timezone}
            today={today}
            members={members}
            isOnlyPet={isOnlyPet}
            onSlotPress={(logId) => {
              setActiveLogId(logId);
              setActivePetId(pet.id);
              void detailSheetRef.current?.present();
            }}
            onLogPress={() => {
              setLogPet(pet);
              void logSheetRef.current?.present();
            }}
          />
        ))}
      </View>
    );
  };

  return (
    <ScreenView>
      <ScreenScrollView contentContainerStyle={styles.content}>
        {timezone && (
          <AppText size={14} color="textSecondary">
            {formatDayAndDate(new Date(), timezone)}
          </AppText>
        )}

        {hasPets && !isOnlyPet && (
          <AppText variant="header" size={32}>
            Today
          </AppText>
        )}

        {renderBody()}

        <TileGrid tiles={HOME_TILES} />
      </ScreenScrollView>

      <ActionPopover
        actions={CREATE_ACTIONS}
        primaryAction={{
          label: 'Log a feed',
          icon: 'utensils',
          isDisabled: !popoverPet,
          onPress: () => {
            setLogPet(popoverPet);
            void logSheetRef.current?.present();
          }
        }}
      />

      <LogFeedSheet sheetRef={logSheetRef} petId={logPet?.id} petName={logPet?.name} />

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
    }
  });

export default Home;
