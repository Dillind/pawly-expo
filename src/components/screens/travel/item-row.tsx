import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import PetAvatar from '@/components/screens/home/pet-avatar';
import PostChip from '@/components/ui/post-chip';
import { CHECKLIST_ITEM_MAX } from '@/constants/schemas/travel';
import { Fonts, IconSize, MaxFontScale, Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight } from '@/lib/haptics';
import type { ChecklistItem } from '@/services/travel-checklist.service';
import type { Pet } from '@/types/core';

const TICK = 26;
const EMOJI_SLOT = 24;
const DELETE_WIDTH = 88;
const AVATAR = 20;

type Props = {
  item: ChecklistItem;
  pet: Pet | undefined;
  isOwner: boolean;
  isEditing: boolean;
  onTick: (isTicked: boolean) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onRename: (text: string) => void;
  onPickEmoji: () => void;
  onOptions: () => void;
  onRemove: () => void;
};

const DeleteAction = ({ label, onPress }: { label: string; onPress: () => void }) => {
  const styles = useStyles(makeStyles);

  return (
    <PressableOpacity
      style={styles.deleteAction}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}>
      <Icon name="trash" size={IconSize.action} color="onError" />
    </PressableOpacity>
  );
};

// Editing is owned by the screen, so the options tray can start it too.
// Only an Owner gets the editor, the emoji slot, the pencil and the swipe.
const ItemRow = ({
  item,
  pet,
  isOwner,
  isEditing,
  onTick,
  onEditStart,
  onEditEnd,
  onRename,
  onPickEmoji,
  onOptions,
  onRemove
}: Props) => {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [draft, setDraft] = useState(item.text);

  const tick = () => {
    hapticLight();
    onTick(!item.isTicked);
  };

  const startEdit = () => {
    setDraft(item.text);
    onEditStart();
  };

  const commit = () => {
    const next = draft.trim();
    if (next && next !== item.text) onRename(next);
    onEditEnd();
  };

  const emojiSlot = item.emoji ? (
    <AppText size={18}>{item.emoji}</AppText>
  ) : isOwner ? (
    <View style={styles.emojiEmpty}>
      <Icon name="sparkles" size={12} color="textSecondary" />
    </View>
  ) : null;

  const body = (
    <View style={styles.row}>
      <PressableOpacity
        accessibilityRole="checkbox"
        accessibilityLabel={item.text}
        accessibilityState={{ checked: item.isTicked }}
        style={styles.tickTarget}
        onPress={tick}>
        <View style={[styles.tick, item.isTicked && styles.tickOn]}>
          {item.isTicked && (
            <Icon name="check" size={IconSize.inline} color="onPrimary" strokeWidth={2.6} />
          )}
        </View>
      </PressableOpacity>

      {isOwner ? (
        <PressableOpacity
          style={styles.emojiSlot}
          accessibilityRole="button"
          accessibilityLabel={item.emoji ? `Change the emoji for ${item.text}` : 'Add an emoji'}
          hitSlop={8}
          onPress={onPickEmoji}>
          {emojiSlot}
        </PressableOpacity>
      ) : (
        <View style={styles.emojiSlot}>{emojiSlot}</View>
      )}

      {isEditing ? (
        <TextInput
          maxFontSizeMultiplier={MaxFontScale.body}
          value={draft}
          onChangeText={setDraft}
          onBlur={commit}
          onSubmitEditing={commit}
          maxLength={CHECKLIST_ITEM_MAX}
          autoFocus
          returnKeyType="done"
          style={[styles.input, { color: colors.text }]}
        />
      ) : (
        <PressableOpacity
          style={styles.textTarget}
          accessibilityRole={isOwner ? 'button' : 'text'}
          accessibilityLabel={isOwner ? `Edit ${item.text}` : item.text}
          onPress={isOwner ? startEdit : tick}
          onLongPress={isOwner ? onOptions : undefined}>
          <AppText
            size={16}
            color={item.isTicked ? 'textSecondary' : 'text'}
            style={item.isTicked && styles.ticked}>
            {item.text}
          </AppText>
        </PressableOpacity>
      )}

      {pet && (
        <PostChip
          leading={<PetAvatar photoUrl={pet.photoUrl} size={AVATAR} />}
          label={pet.name}
          onPress={isOwner ? onOptions : undefined}
          accessibilityLabel={`For ${pet.name}`}
        />
      )}

      {isOwner && !isEditing && (
        <IconButton
          name="pencil"
          accessibilityLabel={`Edit ${item.text}`}
          variant="ghost"
          color="textSecondary"
          size={IconSize.control}
          onPress={onOptions}
        />
      )}
    </View>
  );

  if (!isOwner) return body;

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={DELETE_WIDTH / 2}
      renderRightActions={() => <DeleteAction label={`Remove ${item.text}`} onPress={onRemove} />}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') onRemove();
      }}>
      {body}
    </ReanimatedSwipeable>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two + spacing.one,
      minHeight: 52,
      paddingVertical: spacing.one,
      paddingHorizontal: spacing.three,
      backgroundColor: colors.backgroundElement
    },
    tickTarget: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -spacing.two
    },
    tick: {
      width: TICK,
      height: TICK,
      borderRadius: Radius.full,
      borderWidth: 1.8,
      borderColor: colors.ghostBorder,
      alignItems: 'center',
      justifyContent: 'center'
    },
    tickOn: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    emojiSlot: {
      width: EMOJI_SLOT,
      height: EMOJI_SLOT,
      alignItems: 'center',
      justifyContent: 'center'
    },
    emojiEmpty: {
      width: EMOJI_SLOT,
      height: EMOJI_SLOT,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.ghostBorder,
      alignItems: 'center',
      justifyContent: 'center'
    },
    textTarget: {
      flex: 1,
      minHeight: 44,
      justifyContent: 'center'
    },
    ticked: {
      textDecorationLine: 'line-through'
    },
    input: {
      flex: 1,
      minHeight: 44,
      fontSize: 16,
      fontFamily: Fonts.regular,
      paddingVertical: 0
    },
    deleteAction: {
      width: DELETE_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.error
    }
  });

export default ItemRow;
