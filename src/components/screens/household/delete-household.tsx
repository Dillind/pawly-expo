import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import type { IconName } from '@/constants/icon-map';
import {
  deleteHouseholdSchema,
  type DeleteHouseholdInput
} from '@/constants/schemas/delete-household';
import { BottomTabInset, Radius, type AppTheme } from '@/constants/theme';
import { useFollowers } from '@/hooks/queries/follow/use-follows';
import { useDeleteHousehold } from '@/hooks/queries/household/use-delete-household';
import { useHouseholdById } from '@/hooks/queries/household/use-household-by-id';
import { useHouseholdMembers } from '@/hooks/queries/household/use-household-members';
import { useStyles } from '@/hooks/use-styles';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { countDigits } from '@/utils/counts';

type Props = {
  householdId: string;
};

type Loss = { icon: IconName; label: string };

const DeleteHousehold = ({ householdId }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: household, isLoading, isError, refetch } = useHouseholdById(householdId);
  const { data: members = [] } = useHouseholdMembers(householdId);
  const { data: followers = [] } = useFollowers(householdId);

  const { mutate: deleteHousehold, isPending: isDeleting } = useDeleteHousehold(householdId);

  const name = household?.name ?? '';

  const form = useForm<DeleteHouseholdInput>({
    resolver: zodResolver(deleteHouseholdSchema(name)),
    defaultValues: { confirmation: '' },
    // The one screen in the app that revalidates on every keystroke. The red
    // button has to turn on at the exact moment the name matches, and an error
    // that waits for a blur would sit under a field the Owner has just got
    // right.
    mode: 'onChange'
  });

  const { control, handleSubmit, formState } = form;
  const confirmation = useWatch({ control, name: 'confirmation' });

  const isConfirmed = confirmation?.trim() === name.trim() && name.length > 0;
  const isBusy = isDeleting || formState.isSubmitting;

  // No alert on top of this. The typed name is the confirmation, and a second
  // one would teach the Owner to tap through both.
  const submit = handleSubmit((values) =>
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

        showSuccessToast(SuccessMessage.HouseholdDeleted);

        // dismissTo rather than back: every screen below this one belongs to
        // the household that no longer exists.
        router.dismissTo('/home');
      },
      onError: () => showErrorToast(ErrorMessage.HouseholdDeleteFailed)
    })
  );

  if (isLoading) {
    return (
      <ScreenView edges={[]}>
        <ActivityIndicator style={styles.loading} />
      </ScreenView>
    );
  }

  if (isError || !household) {
    return (
      <ScreenView edges={[]}>
        <ErrorState title="Couldn't load this household" onRetry={() => void refetch()} />
      </ScreenView>
    );
  }

  const losses: Loss[] = [
    { icon: 'pawPrint', label: countDigits(household.pets.length, 'pet') },
    { icon: 'users', label: countDigits(members.length, 'member') },
    { icon: 'userPlus', label: countDigits(followers.length, 'follower') },
    { icon: 'utensils', label: 'Every feed time and the whole feed history' },
    { icon: 'image', label: 'Every post, photo and comment' },
    { icon: 'clipboardList', label: 'Every Care Card and reminder' }
  ];

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        // The red button sits under the field, so it is behind the keyboard
        // while the name is being typed. A drag is the way back to it.
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
        isKeyboardAware>
        <View style={styles.warning}>
          <View style={styles.warningHeading}>
            <Icon name="circleAlert" size={20} color="error" />
            <AppText variant="header" size={18} fontWeight="bold" color="error">
              This cannot be undone
            </AppText>
          </View>
          <AppText size={14} color="text">
            Deleting {household.name} removes it for everyone, not just for you. Nobody is asked
            first and nothing can be restored.
          </AppText>
        </View>

        <View style={styles.losses}>
          <AppText size={13} color="textSecondary">
            What goes with it
          </AppText>
          {losses.map((loss) => (
            <View key={loss.label} style={styles.loss}>
              <Icon name={loss.icon} size={18} color="textSecondary" />
              <AppText size={15}>{loss.label}</AppText>
            </View>
          ))}
        </View>

        <FormProvider {...form}>
          <Controller
            control={control}
            name="confirmation"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInputValidated
                name="confirmation"
                label={`Type ${household.name} to confirm`}
                isLabelIndicated
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={household.name}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
            )}
          />

          <MainButton
            text={isDeleting ? 'Deleting…' : 'Delete this household'}
            variant="destructive"
            isLoading={isDeleting}
            isDisabled={!isConfirmed || isBusy}
            onPress={submit}
          />
        </FormProvider>
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingVertical: spacing.four,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.four
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
    },
    losses: {
      gap: spacing.two
    },
    loading: {
      marginTop: spacing.five
    },
    loss: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingHorizontal: spacing.three,
      paddingVertical: spacing.two + spacing.one,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    }
  });

export default DeleteHousehold;
