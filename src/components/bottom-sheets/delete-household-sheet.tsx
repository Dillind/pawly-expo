import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRouter } from 'expo-router';
import type { RefObject } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import FormTextInput from '@/components/core/form-text-input';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import {
  deleteHouseholdSchema,
  type DeleteHouseholdInput
} from '@/constants/schemas/delete-household';
import { IconSize, Radius, type AppTheme } from '@/constants/theme';
import { useDeleteHousehold } from '@/hooks/queries/household/use-delete-household';
import { useStyles } from '@/hooks/use-styles';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  householdId: string;
  name: string;
};

const DeleteHouseholdSheet = ({ sheetRef, householdId, name }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { mutate: deleteHousehold, isPending: isDeleting } = useDeleteHousehold(householdId);

  const form = useForm<DeleteHouseholdInput>({
    resolver: zodResolver(deleteHouseholdSchema(name)),
    defaultValues: { confirmation: '' },
    // On every keystroke, not on blur: the red button has to arm the moment
    // the name matches.
    mode: 'onChange'
  });

  const { control, handleSubmit } = form;
  const confirmation = useWatch({ control, name: 'confirmation' });

  const isConfirmed = confirmation?.trim() === name.trim() && name.length > 0;

  // No alert on top of this: the typed name is the confirmation, and a second
  // one would teach the Owner to tap through both. onDismissed comes from the
  // event handler because React Compiler only permits a ref read there.
  const submit = (onDismissed: () => Promise<void>) =>
    handleSubmit((values) =>
      deleteHousehold(values.confirmation, {
        onSuccess: (result) => {
          if (result.status !== 'deleted') {
            showErrorToast(
              result.status === 'not_owner'
                ? ErrorMessage.HouseholdDeleteNotOwner
                : ErrorMessage.HouseholdDeleteFailed
            );
            return;
          }

          // The navigation waits for the native dismissal: it tears down the
          // screen that owns this sheet.
          void onDismissed().then(() => {
            showSuccessToast(SuccessMessage.HouseholdDeleted);

            // dismissTo rather than back: every screen below this one belongs
            // to the household that no longer exists.
            router.dismissTo('/home');
          });
        }
      })
    )();

  return (
    <BaseSheet
      sheetRef={sheetRef}
      title="Delete household"
      detents={['auto']}
      // A confirmed name left behind would reopen the sheet already armed.
      onDismiss={() => form.reset()}>
      <View style={styles.body}>
        <View style={styles.warning}>
          <View style={styles.warningHeading}>
            <Icon name="circleAlert" size={IconSize.action} color="error" />
            <AppText variant="header" size="title3" fontWeight="bold" color="error">
              This cannot be undone
            </AppText>
          </View>
          <AppText size="subhead" color="text">
            Deleting {name} removes it for everyone, not just for you. Every pet, member, feed, post
            and Care Card goes with it, and nothing can be restored.
          </AppText>
        </View>

        <FormProvider {...form}>
          <View style={styles.form}>
            <FormTextInput
              name="confirmation"
              label={`Type ${name} to confirm`}
              isLabelIndicated
              placeholder={name}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />

            <MainButton
              text={isDeleting ? 'Deleting…' : 'Delete this household'}
              variant="destructive"
              isLoading={isDeleting}
              isDisabled={!isConfirmed || isDeleting}
              onPress={() => void submit(async () => void (await sheetRef.current?.dismiss()))}
            />
          </View>
        </FormProvider>
      </View>
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

export default DeleteHouseholdSheet;
