import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import BaseSheet from '@/components/bottom-sheets/base-sheet';
import FormTextInput from '@/components/core/form-text-input';
import MainButton from '@/components/core/main-button';
import PasswordGuidelines from '@/components/screens/auth/password-guidelines';
import {
  updatePasswordSchema,
  type UpdatePasswordFormValues
} from '@/constants/schemas/update-password';
import type { AppTheme } from '@/constants/theme';
import { useUpdatePassword } from '@/hooks/queries/account/use-update-password';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
};

const UpdatePasswordSheet = ({ sheetRef }: Props) => {
  const styles = useStyles(makeStyles);
  const { mutate: updatePassword, isPending: isSaving } = useUpdatePassword();

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
    mode: 'onTouched'
  });
  const {
    control,
    handleSubmit,
    setError,
    formState: { isValid }
  } = form;

  const submit = (onDone: () => void) =>
    handleSubmit(({ currentPassword, password }) =>
      updatePassword(
        { currentPassword, password },
        {
          onSuccess: (status) => {
            if (status === 'updated') return onDone();
            setError('currentPassword', { message: 'That password is not right' });
          }
        }
      )
    )();

  return (
    <BaseSheet
      sheetRef={sheetRef}
      title="Update password"
      detents={['auto']}
      onDismiss={() => form.reset()}>
      <FormProvider {...form}>
        <View style={styles.form}>
          <FormTextInput
            control={control}
            name="currentPassword"
            label="Current password"
            isLabelIndicated
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            returnKeyType="next"
          />
          <FormTextInput
            control={control}
            name="password"
            label="New password"
            isLabelIndicated
            placeholder="Enter password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            returnKeyType="next"
          />
          <FormTextInput
            control={control}
            name="confirmPassword"
            label="Confirm new password"
            isLabelIndicated
            placeholder="Type it again"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            returnKeyType="done"
          />

          <PasswordGuidelines />

          <MainButton
            text="Update password"
            isLoading={isSaving}
            isDisabled={isSaving || !isValid}
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

export default UpdatePasswordSheet;
