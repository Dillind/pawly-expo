import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useState, type RefObject } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import FormTextInput from '@/components/core/form-text-input';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import {
  DELETE_ACCOUNT_PHRASE,
  deleteAccountSchema,
  type DeleteAccountInput
} from '@/constants/schemas/delete-account';
import { IconSize, Radius, type AppTheme } from '@/constants/theme';
import { useAccountDeletionBlockers } from '@/hooks/queries/account/use-account-deletion-blockers';
import { useDeleteAccount } from '@/hooks/queries/account/use-delete-account';
import { useStyles } from '@/hooks/use-styles';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
};

const DeleteAccountSheet = ({ sheetRef }: Props) => {
  const styles = useStyles(makeStyles);
  const [isPresented, setIsPresented] = useState(false);

  const { data: blockers = [], isLoading } = useAccountDeletionBlockers(isPresented);
  const { mutate: deleteAccount, isPending: isDeleting } = useDeleteAccount();

  const form = useForm<DeleteAccountInput>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { confirmation: '' },
    mode: 'onChange'
  });
  const { control, handleSubmit } = form;
  const confirmation = useWatch({ control, name: 'confirmation' });
  const isConfirmed = confirmation?.trim() === DELETE_ACCOUNT_PHRASE;

  // The typed phrase is the confirmation; no alert on top of it (ADR 0040).
  const submit = (onDismissed: () => Promise<void>) =>
    handleSubmit((values) =>
      deleteAccount(values.confirmation, {
        onSuccess: (result) => {
          if (result.status === 'deleted') {
            showSuccessToast(SuccessMessage.AccountDeleted);
            void onDismissed();
            return;
          }
          if (result.status === 'confirmation_mismatch') {
            showErrorToast(ErrorMessage.AccountDeleteFailed);
          }
        }
      })
    )();

  const renderBody = () => {
    if (isLoading) return <ActivityIndicator style={styles.loading} />;

    if (blockers.length > 0) {
      return (
        <View style={styles.warning}>
          <View style={styles.warningHeading}>
            <Icon name="circleAlert" size={IconSize.action} color="error" />
            <AppText variant="header" size="titleSmall" fontWeight="bold" color="error">
              You are the only owner
            </AppText>
          </View>
          <AppText size="subhead" color="text">
            You are the only owner of {blockers.join(', ')}, and other people still use it. Make
            another member an owner, or delete the household, before you delete your account.
          </AppText>
        </View>
      );
    }

    return (
      <>
        <View style={styles.warning}>
          <View style={styles.warningHeading}>
            <Icon name="circleAlert" size={IconSize.action} color="error" />
            <AppText variant="header" size="titleSmall" fontWeight="bold" color="error">
              This cannot be undone
            </AppText>
          </View>
          <AppText size="subhead" color="text">
            Your account, your profile and every household you are the only member of are deleted
            for good. You leave every other household. Feeds, posts and comments you wrote stay with
            those households, without your name.
          </AppText>
        </View>

        <FormProvider {...form}>
          <View style={styles.form}>
            <FormTextInput
              control={control}
              name="confirmation"
              label={`Type ${DELETE_ACCOUNT_PHRASE} to confirm`}
              isLabelIndicated
              placeholder={DELETE_ACCOUNT_PHRASE}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />

            <MainButton
              text={isDeleting ? 'Deleting…' : 'Delete my account'}
              variant="destructive"
              isLoading={isDeleting}
              isDisabled={!isConfirmed || isDeleting}
              onPress={() => void submit(async () => void (await sheetRef.current?.dismiss()))}
            />
          </View>
        </FormProvider>
      </>
    );
  };

  return (
    <BaseSheet
      sheetRef={sheetRef}
      title="Delete account"
      detents={['auto']}
      onPresent={() => setIsPresented(true)}
      onDismiss={() => {
        setIsPresented(false);
        form.reset();
      }}>
      <View style={styles.body}>{renderBody()}</View>
    </BaseSheet>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    body: {
      gap: spacing.four
    },
    form: {
      gap: spacing.three
    },
    loading: {
      paddingVertical: spacing.four
    },
    warning: {
      gap: spacing.two,
      padding: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderColor: colors.error,
      backgroundColor: colors.errorMuted
    },
    warningHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    }
  });

export default DeleteAccountSheet;
