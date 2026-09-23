import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useState, type RefObject } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import FormTextInput from '@/components/core/form-text-input';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import Tray, { useTray, type TrayStepDescriptor } from '@/components/core/tray';
import EmojiStep from '@/components/ui/emoji-step';
import {
  CHECKLIST_NAME_MAX,
  checklistNameSchema,
  type ChecklistNameInput
} from '@/constants/schemas/travel';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

const EMOJI_WELL = 64;

type ChecklistFormValues = { name: string; emoji: string | null };

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  title: string;
  submitLabel: string;
  initial?: ChecklistFormValues;
  isSaving: boolean;
  onSubmit: (values: ChecklistFormValues, onDone: () => void) => void;
};

const NameStep = ({
  emoji,
  isSaving,
  submitLabel,
  onSubmit
}: {
  emoji: string | null;
  isSaving: boolean;
  submitLabel: string;
  onSubmit: (name: string) => void;
}) => {
  const styles = useStyles(makeStyles);
  const { goTo } = useTray();
  const { handleSubmit } = useFormContext<ChecklistNameInput>();

  const submit = () => handleSubmit((values) => onSubmit(values.name))();

  return (
    <View style={styles.form}>
      <View style={styles.row}>
        <PressableOpacity
          style={styles.well}
          accessibilityRole="button"
          accessibilityLabel={emoji ? `Emoji ${emoji}, change it` : 'Choose an emoji'}
          onPress={() => goTo('emoji')}>
          {emoji ? (
            <AppText size="titleLarge">{emoji}</AppText>
          ) : (
            <Icon name="sparkles" size={22} color="textSecondary" />
          )}
        </PressableOpacity>

        <View style={styles.field}>
          <FormTextInput
            name="name"
            label="Name"
            isLabelIndicated
            placeholder="Overnight at Mum's"
            maxLength={CHECKLIST_NAME_MAX}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
          />
        </View>
      </View>

      <AppText size="footnote" color="textSecondary">
        Tap the emoji to change it. It is optional.
      </AppText>

      <MainButton
        text={isSaving ? 'Saving…' : submitLabel}
        isLoading={isSaving}
        isDisabled={isSaving}
        onPress={() => void submit()}
      />
    </View>
  );
};

// One tray for both create and rename: the same two steps, name and emoji.
// The form lives here, not in the step: a step unmounts when the tray moves
// to the emoji picker, and a form inside it would lose the name.
const ChecklistFormTray = ({
  sheetRef,
  title,
  submitLabel,
  initial,
  isSaving,
  onSubmit
}: Props) => {
  // `undefined` is "not chosen yet", so a rename opens on the checklist's own
  // emoji without an effect copying the prop into state.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const emoji = picked === undefined ? (initial?.emoji ?? null) : picked;

  const form = useForm<ChecklistNameInput>({
    resolver: zodResolver(checklistNameSchema),
    defaultValues: { name: initial?.name ?? '' }
  });

  const steps: TrayStepDescriptor[] = [
    {
      id: 'name',
      title,
      render: () => (
        <NameStep
          emoji={emoji}
          isSaving={isSaving}
          submitLabel={submitLabel}
          onSubmit={(name) => onSubmit({ name, emoji }, () => void sheetRef.current?.dismiss())}
        />
      )
    },
    {
      id: 'emoji',
      title: 'Choose an emoji',
      render: () => <EmojiStepWithBack onPick={setPicked} />
    }
  ];

  return (
    <FormProvider {...form}>
      <Tray
        sheetRef={sheetRef}
        steps={steps}
        onDismiss={() => {
          setPicked(undefined);
          form.reset({ name: initial?.name ?? '' });
        }}
      />
    </FormProvider>
  );
};

const EmojiStepWithBack = ({ onPick }: { onPick: (emoji: string) => void }) => {
  const { back } = useTray();

  return (
    <EmojiStep
      onPick={(emoji) => {
        onPick(emoji);
        back();
      }}
    />
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    form: {
      gap: spacing.three
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    well: {
      width: EMOJI_WELL,
      height: EMOJI_WELL,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundSheetRow
    },
    field: {
      flex: 1
    }
  });

export default ChecklistFormTray;
