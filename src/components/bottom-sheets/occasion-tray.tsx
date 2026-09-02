import SheetRow from '@/components/bottom-sheets/sheet-row';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import TextInputValidated from '@/components/core/text-input-validated';
import Tray, { useTray, type TrayStepDescriptor } from '@/components/core/tray';
import OccasionEmoji from '@/components/ui/occasion-emoji';
import PostChip from '@/components/ui/post-chip';
import { EMOJI_GROUPS } from '@/constants/emoji';
import { Radius, type AppTheme } from '@/constants/theme';
import {
  useCreateOccasion,
  useOccasions,
  useRemoveOccasion,
  useUpdateOccasion
} from '@/hooks/queries/posts/use-occasions';
import { useStyles } from '@/hooks/use-styles';
import OccasionService, { type Occasion } from '@/services/occasion.service';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useState, type RefObject } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

export const LABEL_MAX = 24;

type Draft = { id: string | null; emoji: string | null; label: string };

const EMPTY_DRAFT: Draft = { id: null, emoji: null, label: '' };

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  householdId: string | undefined;
  selectedId: string | null;
  onSelect: (occasionId: string | null) => void;
};

const EMOJI_SLOT = 22;

/** An Occasion needs an emoji or words. A draft with neither cannot be saved. */
const isDraftUsable = (draft: Draft) => Boolean(draft.emoji) || draft.label.trim().length > 0;

const ChooseStep = ({
  occasions,
  selectedId,
  onChoose,
  onCreate,
  onEditOne
}: {
  occasions: Occasion[];
  selectedId: string | null;
  onChoose: (occasionId: string | null) => void;
  onCreate: () => void;
  onEditOne: (occasion: Occasion) => void;
}) => {
  const styles = useStyles(makeStyles);
  const { goTo } = useTray();
  const [isEditing, setIsEditing] = useState(false);
  const { mutate: removeOccasion } = useRemoveOccasion(occasions[0]?.householdId);

  // The count is the fact the decision turns on, so it is read before the
  // alert rather than guessed at inside it.
  const confirmRemove = async (occasion: Occasion) => {
    let count = 0;

    try {
      count = await OccasionService.countPosts(occasion.id);
    } catch (error) {
      console.error(error);
    }

    const name = occasion.label ?? occasion.emoji ?? 'this occasion';
    const carried =
      count === 1 ? 'The 1 post that carries it keeps it.' : `The ${count} posts that carry it keep it.`;

    Alert.alert(
      `Remove "${name}"?`,
      count === 0 ? 'It leaves the picker.' : `It leaves the picker. ${carried}`,
      [
        { text: 'Cancel', style: 'cancel', isPreferred: true },
        { text: 'Remove', style: 'destructive', onPress: () => removeOccasion(occasion) }
      ]
    );
  };

  return (
    <View style={styles.stack}>
      <View style={styles.editBar}>
        <PressableOpacity
          onPress={() => setIsEditing((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'Finish editing occasions' : 'Edit occasions'}>
          <AppText size={15} color="primaryText" fontWeight="bold">
            {isEditing ? 'Done' : 'Edit'}
          </AppText>
        </PressableOpacity>
      </View>

      <View style={styles.rows}>
        {occasions.map((occasion) => (
          <View key={occasion.id} style={styles.editableRow}>
            <View style={styles.rowBody}>
              <SheetRow
                label={occasion.label ?? ''}
                leading={
                  occasion.emoji ? (
                    <OccasionEmoji emoji={occasion.emoji} size={EMOJI_SLOT} />
                  ) : undefined
                }
                isSelected={!isEditing && occasion.id === selectedId}
                onPress={() => {
                  if (!isEditing) {
                    onChoose(occasion.id);
                    return;
                  }

                  onEditOne(occasion);
                  goTo('edit');
                }}
              />
            </View>

            {/* Only the trailing control changes between the two modes, so
                nothing in the list moves under the finger. */}
            {isEditing && (
              <IconButton
                name="trash"
                variant="ghost"
                size={18}
                accessibilityLabel={`Remove ${occasion.label ?? 'this occasion'}`}
                onPress={() => void confirmRemove(occasion)}
              />
            )}
          </View>
        ))}

        <SheetRow
          icon="plus"
          label="Create an occasion"
          onPress={() => {
            onCreate();
            goTo('edit');
          }}
        />

        <SheetRow
          label="No occasion"
          isSelected={!isEditing && selectedId === null}
          onPress={() => {
            if (isEditing) return;
            onChoose(null);
          }}
        />
      </View>
    </View>
  );
};

const EditStep = ({
  draft,
  isSaving,
  onChange,
  onSave
}: {
  draft: Draft;
  isSaving: boolean;
  onChange: (next: Draft) => void;
  onSave: () => void;
}) => {
  const styles = useStyles(makeStyles);
  const { goTo } = useTray();
  const label = draft.label.trim();

  return (
    <View style={styles.stack}>
      <View style={styles.draftRow}>
        <PressableOpacity
          style={styles.emojiWell}
          onPress={() => goTo('emoji')}
          accessibilityRole="button"
          accessibilityLabel={draft.emoji ? 'Change the emoji' : 'Add an emoji'}>
          {draft.emoji ? (
            <AppText size={26}>{draft.emoji}</AppText>
          ) : (
            <Icon name="plus" size={20} color="textSecondary" />
          )}
        </PressableOpacity>

        <View style={styles.draftField}>
          <TextInputValidated
            label="Label"
            value={draft.label}
            onChangeText={(next) => onChange({ ...draft, label: next })}
            placeholder="First swim"
            maxLength={LABEL_MAX}
          />
        </View>
      </View>

      <AppText size={13} color="textSecondary">
        Add an emoji, a label, or both. One of the two is enough.
      </AppText>

      {/* Absent until there is something to show. An empty pill on the way to
          a real one reads as a rendering fault, not as a preview. */}
      {isDraftUsable(draft) && (
        <View style={styles.preview}>
          <AppText size={13} fontWeight="bold" color="textSecondary">
            HOW IT WILL READ
          </AppText>

          {/* On `postSurface`, because that is the only ground the chip is ever
              seen against -- it disappears on the sheet's own fill. */}
          <View style={styles.previewSurface}>
            <PostChip
              leading={draft.emoji ? <OccasionEmoji emoji={draft.emoji} size={20} /> : null}
              label={label || null}
            />
          </View>
        </View>
      )}

      <MainButton
        text={draft.id ? 'Save changes' : 'Save occasion'}
        isDisabled={!isDraftUsable(draft) || isSaving}
        isLoading={isSaving}
        onPress={onSave}
      />
    </View>
  );
};

const EmojiStep = ({ onPick }: { onPick: (emoji: string) => void }) => {
  const styles = useStyles(makeStyles);
  const { back } = useTray();
  const [term, setTerm] = useState('');
  const needle = term.trim().toLowerCase();

  const groups = EMOJI_GROUPS.map((group) => ({
    title: group.title,
    emoji: needle
      ? group.emoji.filter(
          (entry) =>
            entry.keywords.includes(needle) || group.title.toLowerCase().includes(needle)
        )
      : group.emoji
  })).filter((group) => group.emoji.length > 0);

  return (
    <View style={styles.stack}>
      <TextInputValidated
        value={term}
        onChangeText={setTerm}
        placeholder="Search"
        autoCapitalize="none"
        leftIcon={<Icon name="search" size={18} color="textSecondary" />}
      />

      <ScrollView style={styles.emojiScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.emojiGroups}>
          {groups.map((group) => (
            <View key={group.title} style={styles.emojiGroup}>
              <AppText size={13} fontWeight="bold" color="textSecondary">
                {group.title.toUpperCase()}
              </AppText>

              <View style={styles.emojiGrid}>
                {group.emoji.map((entry) => (
                  <PressableOpacity
                    key={entry.char}
                    style={styles.emojiCell}
                    accessibilityRole="button"
                    accessibilityLabel={entry.keywords}
                    onPress={() => {
                      onPick(entry.char);
                      back();
                    }}>
                    <AppText size={26}>{entry.char}</AppText>
                  </PressableOpacity>
                ))}
              </View>
            </View>
          ))}

          {groups.length === 0 && (
            <AppText size={15} color="textSecondary">
              No emoji match &ldquo;{term.trim()}&rdquo;.
            </AppText>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

/**
 * Choosing an Occasion, and keeping the household's set. One sheet whose
 * content swaps -- a second sheet raised from the first is the thing the Tray
 * exists to avoid. See ADR 0035.
 */
const OccasionTray = ({ sheetRef, householdId, selectedId, onSelect }: Props) => {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const { data: occasions = [] } = useOccasions(householdId);
  const { mutate: createOccasion, isPending: isCreating } = useCreateOccasion(householdId);
  const { mutate: updateOccasion, isPending: isUpdating } = useUpdateOccasion(householdId);

  const close = () => void sheetRef.current?.dismiss();

  const choose = (occasionId: string | null) => {
    onSelect(occasionId);
    close();
  };

  const save = () => {
    const emoji = draft.emoji;
    const label = draft.label.trim() || null;

    if (draft.id) {
      updateOccasion({ id: draft.id, emoji, label }, { onSuccess: close });
      return;
    }

    // The new Occasion is chosen straight away. A member who has just described
    // it is not then asked to find it in the list they came from.
    createOccasion(
      { emoji, label },
      {
        onSuccess: (created) => {
          onSelect(created.id);
          close();
        }
      }
    );
  };

  const steps: TrayStepDescriptor[] = [
    {
      id: 'choose',
      title: "What's the occasion?",
      render: () => (
        <ChooseStep
          occasions={occasions}
          selectedId={selectedId}
          onChoose={choose}
          onCreate={() => setDraft(EMPTY_DRAFT)}
          onEditOne={(occasion) =>
            setDraft({
              id: occasion.id,
              emoji: occasion.emoji,
              label: occasion.label ?? ''
            })
          }
        />
      )
    },
    {
      id: 'edit',
      title: draft.id ? 'Edit occasion' : 'New occasion',
      render: () => (
        <EditStep
          draft={draft}
          isSaving={isCreating || isUpdating}
          onChange={setDraft}
          onSave={save}
        />
      )
    },
    {
      id: 'emoji',
      title: 'Choose an emoji',
      render: () => (
        <EmojiStep onPick={(emoji) => setDraft((current) => ({ ...current, emoji }))} />
      )
    }
  ];

  return <Tray sheetRef={sheetRef} steps={steps} onDismiss={() => setDraft(EMPTY_DRAFT)} />;
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    stack: { gap: spacing.three },
    rows: { gap: spacing.two },
    editBar: { flexDirection: 'row', justifyContent: 'flex-end' },
    editableRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.two },
    rowBody: { flex: 1 },
    draftRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.two },
    draftField: { flex: 1 },
    emojiWell: {
      width: 56,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.backgroundElement
    },
    preview: { gap: spacing.two },
    previewSurface: {
      flexDirection: 'row',
      padding: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.postSurface
    },
    emojiScroll: { maxHeight: 320 },
    emojiGroups: { gap: spacing.three },
    emojiGroup: { gap: spacing.two },
    emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.one },
    emojiCell: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center'
    }
  });

export default OccasionTray;
