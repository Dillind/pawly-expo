import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Stack, useRouter } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import ChecklistFormTray from '@/components/bottom-sheets/checklist-form-tray';
import InfoSheet from '@/components/bottom-sheets/info-sheet';
import ProSheet from '@/components/bottom-sheets/pro-sheet';
import EmptyState from '@/components/core/empty-state';
import ErrorState from '@/components/core/error-state';
import Icon from '@/components/core/icon';
import ListCard from '@/components/core/list-card';
import MainButton from '@/components/core/main-button';
import { SkeletonBlock } from '@/components/core/skeleton';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import ChecklistRow from '@/components/screens/travel/checklist-row';
import { BottomTabInset, HeaderTitleStyle, IconSize, type AppTheme } from '@/constants/theme';
import { TRAVEL_HELP } from '@/constants/travel-help';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useIsHouseholdPro } from '@/hooks/queries/household/use-is-household-pro';
import { useCreateChecklist } from '@/hooks/queries/travel/use-checklist-mutations';
import { useTravelChecklists } from '@/hooks/queries/travel/use-travel-checklists';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useStyles } from '@/hooks/use-styles';

const SKELETON_ROWS = 2;
const SKELETON_HEIGHT = 72;

export const PRO_CHECKLISTS = {
  title: 'More than one checklist',
  lead: "One for the beach, one for Mum's, one for the vet.",
  body: 'Free holds one travel checklist for your household. Pro holds as many as you need, and everyone in the household gets it when one of you subscribes.'
};

const Travel = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const helpRef = useRef<TrueSheet | null>(null);
  const createRef = useRef<TrueSheet | null>(null);
  const proRef = useRef<TrueSheet | null>(null);

  const { data: household } = useHousehold();
  const householdId = household?.id;
  const isOwner = household?.isOwner ?? false;
  const { data: checklists = [], isLoading, isError, refetch } = useTravelChecklists(householdId);
  const { data: isPro = false } = useIsHouseholdPro(householdId);
  const { mutate: createChecklist, isPending: isCreating } = useCreateChecklist();
  const { isRefreshing, onRefresh } = usePullToRefresh([refetch]);

  const atCap = !isPro && checklists.length >= 1;

  const openCreate = () => {
    if (atCap) {
      void proRef.current?.present();
      return;
    }
    void createRef.current?.present();
  };

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

    if (isLoading) {
      return (
        <View style={styles.skeleton}>
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <SkeletonBlock key={index} height={SKELETON_HEIGHT} />
          ))}
        </View>
      );
    }

    if (checklists.length === 0) {
      return (
        <EmptyState
          icon="luggage"
          title="Pack once, remember every time"
          description="A Travel Checklist holds what your pets need when you take them away. Tick things off at the door, then reset it for the next trip."
          action={
            isOwner ? (
              <MainButton
                text="Create checklist"
                leftIcon={<Icon name="plus" size={IconSize.action} color="onPrimary" />}
                onPress={openCreate}
              />
            ) : undefined
          }
        />
      );
    }

    return (
      <View style={styles.rows}>
        {checklists.map((checklist) => (
          <ListCard key={checklist.id}>
            <ChecklistRow checklist={checklist} />
          </ListCard>
        ))}
      </View>
    );
  };

  return (
    <ScreenView edges={[]}>
      <Stack.Title style={HeaderTitleStyle}>Travel</Stack.Title>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="info.circle"
          accessibilityLabel="What is a Travel Checklist?"
          onPress={() => void helpRef.current?.present()}
        />
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel="Create a checklist"
          hidden={!isOwner || checklists.length === 0}
          onPress={openCreate}
        />
      </Stack.Toolbar>

      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}>
        {renderBody()}
      </ScreenScrollView>

      <InfoSheet sheetRef={helpRef} {...TRAVEL_HELP} />
      <ProSheet sheetRef={proRef} {...PRO_CHECKLISTS} />
      <ChecklistFormTray
        sheetRef={createRef}
        title="New checklist"
        submitLabel="Create"
        isSaving={isCreating}
        onSubmit={(values, onDone) => {
          if (!householdId) return;
          createChecklist(
            { householdId, ...values },
            {
              onSuccess: (result) => {
                onDone();
                if (result.status === 'created') {
                  router.push(`/home/travel/${result.checklist.id}`);
                } else {
                  void proRef.current?.present();
                }
              }
            }
          );
        }}
      />
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingTop: spacing.two,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.three
    },
    skeleton: {
      gap: spacing.two
    },
    rows: {
      gap: spacing.three
    }
  });

export default Travel;
