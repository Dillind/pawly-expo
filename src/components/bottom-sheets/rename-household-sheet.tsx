import BaseSheet from '@/components/bottom-sheets/base-sheet';
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import { SuccessMessage } from '@/constants/enums';
import type { AppTheme } from '@/constants/theme';
import { useUpdateHousehold } from '@/hooks/queries/household/use-update-household';
import { useStyles } from '@/hooks/use-styles';
import {
  HOUSEHOLD_NAME_MAX,
  householdNameSchema,
  type HouseholdNameInput
} from '@/constants/schemas/household';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  householdId: string | undefined;
  name: string;
};

const RenameHouseholdSheet = ({ sheetRef, householdId, name }: Props) => {
  const styles = useStyles(makeStyles);
  const { mutate: updateHousehold, isPending: isSaving } = useUpdateHousehold(
    householdId,
    SuccessMessage.HouseholdRenamed
  );

  const form = useForm<HouseholdNameInput>({
    resolver: zodResolver(householdNameSchema),
    defaultValues: { name }
  });
  const { control, handleSubmit } = form;

  const nameValue = useWatch({ control, name: 'name' });

  // onDone is passed in from the event handler rather than closed over here:
  // React Compiler only permits reading a ref in event-handler position, and
  // `sheetRef.current` inside this closure counts as a read during render.
  const submit = (onDone: () => void) =>
    handleSubmit((values) => {
      updateHousehold({ name: values.name }, { onSuccess: onDone });
    })();

  return (
    <BaseSheet sheetRef={sheetRef} title="Household name" detents={['auto']}>
      <FormProvider {...form}>
        <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange } }) => (
              <TextInputValidated
                name="name"
                placeholder="Dylan and Lisa's"
                value={nameValue ?? ''}
                onChangeText={onChange}
                maxLength={HOUSEHOLD_NAME_MAX}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => void submit(() => void sheetRef.current?.dismiss())}
              />
            )}
          />

          <MainButton
            text={isSaving ? 'Saving…' : 'Save'}
            isLoading={isSaving}
            isDisabled={isSaving}
            onPress={() => void submit(() => void sheetRef.current?.dismiss())}
          />
        </View>
      </FormProvider>
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    form: { gap: spacing.three }
  });

export default RenameHouseholdSheet;
