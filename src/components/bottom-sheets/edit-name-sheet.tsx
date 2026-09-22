import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import BaseSheet from '@/components/bottom-sheets/base-sheet';
import FormTextInput from '@/components/core/form-text-input';
import MainButton from '@/components/core/main-button';
import { nameSchema, type NameFormValues } from '@/constants/schemas/name';
import type { AppTheme } from '@/constants/theme';
import { useUpdateName } from '@/hooks/queries/account/use-update-name';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  firstName: string;
  lastName: string;
};

const EditNameSheet = ({ sheetRef, firstName, lastName }: Props) => {
  const styles = useStyles(makeStyles);
  const { mutate: updateName, isPending: isSaving } = useUpdateName();

  const form = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    values: { firstName, lastName }
  });
  const { control, handleSubmit } = form;

  const submit = (onDone: () => void) =>
    handleSubmit((values) => updateName(values, { onSuccess: onDone }))();

  return (
    <BaseSheet sheetRef={sheetRef} title="Name" detents={['auto']} onDismiss={() => form.reset()}>
      <FormProvider {...form}>
        <View style={styles.form}>
          <FormTextInput
            control={control}
            name="firstName"
            label="First name"
            isLabelIndicated
            autoComplete="given-name"
            returnKeyType="next"
          />
          <FormTextInput
            control={control}
            name="lastName"
            label="Last name"
            isLabelIndicated
            autoComplete="family-name"
            returnKeyType="done"
            onSubmitEditing={() => void submit(() => void sheetRef.current?.dismiss())}
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
    form: {
      gap: spacing.three
    }
  });

export default EditNameSheet;
