import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, View, type ScrollView } from 'react-native';

import ChecklistFormTray from '@/components/bottom-sheets/checklist-form-tray';
import ItemOptionsTray from '@/components/bottom-sheets/item-options-tray';
import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import ListCard from '@/components/core/list-card';
import { SkeletonBlock } from '@/components/core/skeleton';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import AddItemRow from '@/components/screens/travel/add-item-row';
import ItemRow from '@/components/screens/travel/item-row';
import PackProgress from '@/components/screens/travel/pack-progress';
import PackedCard from '@/components/screens/travel/packed-card';
import { BottomTabInset, HeaderTitleStyle, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { usePets } from '@/hooks/queries/pet/use-pets';
import {
  useAddItem,
  useDeleteChecklist,
  useRemoveItem,
  useRenameChecklist,
  useResetChecklist,
  useTickItem,
  useUpdateItem
} from '@/hooks/queries/travel/use-checklist-mutations';
import { useTravelChecklist } from '@/hooks/queries/travel/use-travel-checklists';
import { useStyles } from '@/hooks/use-styles';
import { hapticSuccess } from '@/lib/haptics';
import { packedAt } from '@/lib/travel-packing';
import type { ChecklistItem } from '@/services/travel-checklist.service';

const SKELETON_ROWS = 5;
const SKELETON_HEIGHT = 52;

const Checklist = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { checklistId } = useLocalSearchParams<{ checklistId: string }>();
  const scrollRef = useRef<ScrollView | null>(null);
  const renameRef = useRef<TrueSheet | null>(null);
  const optionsRef = useRef<TrueSheet | null>(null);
  const [activeItem, setActiveItem] = useState<ChecklistItem | null>(null);
  const [optionsStep, setOptionsStep] = useState<'main' | 'emoji'>('main');
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: household } = useHousehold();
  const { data: pets = [] } = usePets();
  const isOwner = household?.isOwner ?? false;

  const { data: checklist, isLoading, isError, refetch } = useTravelChecklist(checklistId);
  const { mutate: addItem } = useAddItem(checklistId);
  const { mutate: tickItem } = useTickItem(checklistId);
  const { mutate: updateItem } = useUpdateItem();
  const { mutate: removeItem } = useRemoveItem();
  const { mutate: renameChecklist, isPending: isRenaming } = useRenameChecklist();
  const { mutate: resetChecklist, isPending: isResetting } = useResetChecklist();
  const { mutate: deleteChecklist, isPending: isDeleting } = useDeleteChecklist();

  const items = checklist?.items ?? [];
  const tickedCount = items.filter((item) => item.isTicked).length;
  const packedAtIso = packedAt(items);
  const petNames = pets
    .filter((pet) => items.some((item) => item.petId === pet.id))
    .map((pet) => pet.name);

  // The last tick, on this device, once it is written: a remote tick arriving
  // by refetch is not a moment for the person holding this phone, and a tick
  // that rolls back was not the last one.
  const tick = (item: ChecklistItem, isTicked: boolean) => {
    const isLast = isTicked && tickedCount === items.length - 1;
    tickItem({ itemId: item.id, isTicked }, { onSuccess: () => isLast && hapticSuccess() });
  };

  // Return fires faster than the cache refreshes, so the counter, not the
  // cache, hands out the next position.
  const lastSortOrder = useRef(-1);
  const nextSortOrder = () => {
    const fromCache = items.length === 0 ? -1 : items[items.length - 1].sortOrder;
    lastSortOrder.current = Math.max(lastSortOrder.current, fromCache) + 1;
    return lastSortOrder.current;
  };

  const heading = checklist ? [checklist.emoji, checklist.name].filter(Boolean).join(' ') : '';

  // Outside every early return: behind one the bar has no title and falls
  // back to the route name.
  const title = <Stack.Title style={HeaderTitleStyle}>{heading}</Stack.Title>;

  const confirmReset = () => {
    Alert.alert(
      'Reset this checklist?',
      'Every tick is cleared for the whole household. The items stay.',
      [
        { text: 'Cancel', style: 'cancel', isPreferred: true },
        { text: 'Reset', style: 'destructive', onPress: () => resetChecklist(checklistId) }
      ]
    );
  };

  const confirmDelete = () => {
    if (!checklist) return;
    Alert.alert(
      `Delete ${checklist.name}?`,
      'The checklist and every item on it are removed for the whole household.',
      [
        { text: 'Cancel', style: 'cancel', isPreferred: true },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteChecklist(checklistId, { onSuccess: () => router.back() })
        }
      ]
    );
  };

  const openOptions = (item: ChecklistItem, step: 'main' | 'emoji' = 'main') => {
    setActiveItem(item);
    setOptionsStep(step);
    void optionsRef.current?.present();
  };

  if (!checklistId || isError) {
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

  if (isLoading || !checklist) {
    return (
      <ScreenView edges={[]}>
        {title}
        <ScreenScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          scrollEnabled={false}>
          <View style={styles.skeleton}>
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <SkeletonBlock key={index} height={SKELETON_HEIGHT} />
            ))}
          </View>
        </ScreenScrollView>
      </ScreenView>
    );
  }

  return (
    <ScreenView edges={[]}>
      {title}

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="arrow.counterclockwise"
          accessibilityLabel="Reset the checklist"
          disabled={isResetting || tickedCount === 0}
          onPress={confirmReset}
        />
        <Stack.Toolbar.Menu
          accessibilityLabel="Manage this checklist"
          icon="ellipsis"
          hidden={!isOwner}>
          <Stack.Toolbar.MenuAction icon="pencil" onPress={() => void renameRef.current?.present()}>
            Rename
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="trash"
            destructive
            disabled={isDeleting}
            onPress={confirmDelete}>
            Delete checklist
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <ScreenScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        isKeyboardAware>
        {packedAtIso ? (
          <PackedCard
            packedAt={packedAtIso}
            petNames={petNames}
            isResetting={isResetting}
            onReset={confirmReset}
          />
        ) : (
          items.length > 0 && <PackProgress itemCount={items.length} tickedCount={tickedCount} />
        )}

        <ListCard style={styles.card}>
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              pet={pets.find((pet) => pet.id === item.petId)}
              isOwner={isOwner}
              isEditing={editingId === item.id}
              onTick={(isTicked) => tick(item, isTicked)}
              onEditStart={() => setEditingId(item.id)}
              onEditEnd={() => setEditingId(null)}
              onRename={(text) => updateItem({ itemId: item.id, text })}
              onPickEmoji={() => openOptions(item, 'emoji')}
              onOptions={() => openOptions(item)}
              onRemove={() => removeItem(item.id)}
            />
          ))}

          {items.length === 0 && !isOwner && (
            <View style={styles.emptyItems}>
              <AppText size={15} color="textSecondary">
                Nothing on the list yet.
              </AppText>
            </View>
          )}

          {isOwner && (
            <AddItemRow
              onAdd={(text) =>
                addItem(
                  { text, sortOrder: nextSortOrder() },
                  // The keyboard-aware inset follows focus, not growth: a new row
                  // lands under the keyboard unless the list follows it.
                  { onSuccess: () => scrollRef.current?.scrollToEnd({ animated: true }) }
                )
              }
            />
          )}
        </ListCard>
      </ScreenScrollView>

      <ChecklistFormTray
        sheetRef={renameRef}
        title="Rename checklist"
        submitLabel="Save"
        initial={{ name: checklist.name, emoji: checklist.emoji }}
        isSaving={isRenaming}
        onSubmit={(values, onDone) =>
          renameChecklist({ checklistId, ...values }, { onSuccess: onDone })
        }
      />
      <ItemOptionsTray
        sheetRef={optionsRef}
        item={activeItem}
        pets={pets}
        initialStepId={optionsStep}
        onEdit={setEditingId}
        onSetEmoji={(itemId, emoji) => updateItem({ itemId, emoji })}
        onSetPet={(itemId, petId) => updateItem({ itemId, petId })}
        onRemove={(itemId) => removeItem(itemId)}
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
    card: {
      paddingVertical: spacing.two
    },
    emptyItems: {
      padding: spacing.three
    }
  });

export default Checklist;
