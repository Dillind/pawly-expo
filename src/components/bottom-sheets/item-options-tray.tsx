import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

import SheetRow from '@/components/bottom-sheets/sheet-row';
import Tray, { useTray, type TrayStepDescriptor } from '@/components/core/tray';
import PetAvatar from '@/components/screens/home/pet-avatar';
import EmojiStep from '@/components/ui/emoji-step';
import OccasionEmoji from '@/components/ui/occasion-emoji';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { ChecklistItem } from '@/services/travel-checklist.service';
import type { Pet } from '@/types/core';

const AVATAR = 24;

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  item: ChecklistItem | null;
  pets: Pet[];
  initialStepId?: 'main' | 'emoji';
  onEdit: (itemId: string) => void;
  onSetEmoji: (itemId: string, emoji: string | null) => void;
  onSetPet: (itemId: string, petId: string | null) => void;
  onRemove: (itemId: string) => void;
};

const MainStep = ({
  item,
  pets,
  onEdit,
  onClearEmoji,
  onRemove
}: {
  item: ChecklistItem;
  pets: Pet[];
  onEdit: () => void;
  onClearEmoji: () => void;
  onRemove: () => void;
}) => {
  const styles = useStyles(makeStyles);
  const { goTo, close } = useTray();
  const pet = pets.find((candidate) => candidate.id === item.petId);

  return (
    <View style={styles.rows}>
      <SheetRow
        label="Rename"
        icon="pencil"
        onPress={() => {
          close();
          onEdit();
        }}
      />
      <SheetRow
        label={item.emoji ? 'Change emoji' : 'Add an emoji'}
        leading={item.emoji ? <OccasionEmoji emoji={item.emoji} size={AVATAR} /> : undefined}
        icon={item.emoji ? undefined : 'sparkles'}
        onPress={() => goTo('emoji')}
      />
      {item.emoji && (
        <SheetRow
          label="Remove emoji"
          icon="close"
          onPress={() => {
            onClearEmoji();
            close();
          }}
        />
      )}
      {pets.length > 0 && (
        <SheetRow
          label={pet ? `For ${pet.name}` : 'For one pet'}
          detail={pet ? 'Change' : undefined}
          leading={pet ? <PetAvatar photoUrl={pet.photoUrl} size={AVATAR} /> : undefined}
          icon={pet ? undefined : 'pawPrint'}
          onPress={() => goTo('pet')}
        />
      )}
      <SheetRow
        label="Remove item"
        icon="trash"
        isDestructive
        onPress={() => {
          onRemove();
          close();
        }}
      />
    </View>
  );
};

const PetStep = ({
  item,
  pets,
  onPick
}: {
  item: ChecklistItem;
  pets: Pet[];
  onPick: (petId: string | null) => void;
}) => {
  const styles = useStyles(makeStyles);
  const { close } = useTray();

  return (
    <View style={styles.rows}>
      <SheetRow
        label="Everyone"
        icon="users"
        isSelected={item.petId === null}
        onPress={() => {
          onPick(null);
          close();
        }}
      />
      {pets.map((pet) => (
        <SheetRow
          key={pet.id}
          label={pet.name}
          leading={<PetAvatar photoUrl={pet.photoUrl} size={AVATAR} />}
          isSelected={item.petId === pet.id}
          onPress={() => {
            onPick(pet.id);
            close();
          }}
        />
      ))}
    </View>
  );
};

const EmojiPick = ({ onPick }: { onPick: (emoji: string) => void }) => {
  const { close } = useTray();

  return (
    <EmojiStep
      onPick={(emoji) => {
        onPick(emoji);
        close();
      }}
    />
  );
};

// A tray, not a popover: no popover component exists in this codebase, and a
// second sheet raised from the first is what a Tray exists to avoid.
const ItemOptionsTray = ({
  sheetRef,
  item,
  pets,
  initialStepId = 'main',
  onEdit,
  onSetEmoji,
  onSetPet,
  onRemove
}: Props) => {
  // Always mounted, even with no item: an unmounted tray has no ref, and the
  // present() that sets the item would be lost.
  const steps: TrayStepDescriptor[] = [
    {
      id: 'main',
      title: item?.text ?? '',
      render: () =>
        item ? (
          <MainStep
            item={item}
            pets={pets}
            onEdit={() => onEdit(item.id)}
            onClearEmoji={() => onSetEmoji(item.id, null)}
            onRemove={() => onRemove(item.id)}
          />
        ) : null
    },
    {
      id: 'emoji',
      title: 'Choose an emoji',
      render: () => (item ? <EmojiPick onPick={(emoji) => onSetEmoji(item.id, emoji)} /> : null)
    },
    {
      id: 'pet',
      title: 'Who is it for?',
      render: () =>
        item ? (
          <PetStep item={item} pets={pets} onPick={(petId) => onSetPet(item.id, petId)} />
        ) : null
    }
  ];

  return <Tray sheetRef={sheetRef} steps={steps} initialStepId={initialStepId} />;
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    rows: {
      gap: spacing.two
    }
  });

export default ItemOptionsTray;
