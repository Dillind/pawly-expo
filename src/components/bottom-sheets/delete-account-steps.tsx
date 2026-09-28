import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import SheetRow from '@/components/bottom-sheets/sheet-row';
import AppText from '@/components/core/app-text';
import FormTextInput from '@/components/core/form-text-input';
import MainButton from '@/components/core/main-button';
import { useTray } from '@/components/core/tray';
import {
  DELETE_ACCOUNT_PHRASE,
  deleteAccountSchema,
  type DeleteAccountInput
} from '@/constants/schemas/delete-account';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { AccountHousehold, SignInMethod } from '@/services/auth.service';

const OUTCOME_LABEL: Record<AccountHousehold['outcome'], string> = {
  deleted: 'Deleted',
  leave: 'You leave',
  choose: 'Choose'
};

const OUTCOME_DETAIL: Record<AccountHousehold['outcome'], string> = {
  deleted: 'Only you. Its pets, feeds and photos go too.',
  leave: 'Another Owner looks after it.',
  choose: 'You are the only Owner.'
};

export const HouseholdsStep = ({
  households,
  isLoading,
  isError,
  onRetry,
  nextStepId
}: {
  households: AccountHousehold[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  nextStepId: string;
}) => {
  const styles = useStyles(makeStyles);
  const { goTo } = useTray();

  if (isLoading) return <ActivityIndicator style={styles.loading} />;

  if (isError) {
    return (
      <View style={styles.body}>
        <AppText size="subhead" color="textSecondary">
          Your households could not be loaded.
        </AppText>
        <MainButton text="Try again" variant="secondary" onPress={onRetry} />
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <AppText size="subhead" color="textSecondary">
        {households.length > 0
          ? 'Here is what happens to each household you are in.'
          : 'You are not in a household.'}
      </AppText>
      {households.map((household) => (
        <View key={household.id} style={styles.card}>
          <View style={styles.cardText}>
            <AppText size="headline" fontWeight="bold">
              {household.name}
            </AppText>
            <AppText size="footnote" color="textSecondary">
              {OUTCOME_DETAIL[household.outcome]}
            </AppText>
          </View>
          <AppText
            size="footnote"
            fontWeight="bold"
            color={household.outcome === 'deleted' ? 'error' : 'text'}>
            {OUTCOME_LABEL[household.outcome]}
          </AppText>
        </View>
      ))}
      <MainButton text="Continue" onPress={() => goTo(nextStepId)} />
    </View>
  );
};

export type Successor = { kind: 'member'; userId: string } | { kind: 'delete' };

export const ChooseOwnerStep = ({
  household,
  isSaving,
  nextStepId,
  onContinue
}: {
  household: AccountHousehold;
  isSaving: boolean;
  nextStepId: string;
  onContinue: (choice: Successor, goNext: () => void) => void;
}) => {
  const styles = useStyles(makeStyles);
  const { goTo } = useTray();
  const [choice, setChoice] = useState<Successor | null>(null);

  return (
    <View style={styles.body}>
      <AppText size="subhead" color="textSecondary">
        You are the only Owner of {household.name}. Who looks after it now?
      </AppText>
      <View style={styles.rows}>
        {household.members.map((member) => (
          <SheetRow
            key={member.userId}
            label={`Make ${member.firstName ?? 'this member'} the Owner`}
            icon="user"
            isSelected={choice?.kind === 'member' && choice.userId === member.userId}
            onPress={() => setChoice({ kind: 'member', userId: member.userId })}
          />
        ))}
        <SheetRow
          label={`Delete ${household.name}`}
          detail="For everyone"
          icon="trash"
          isDestructive
          isSelected={choice?.kind === 'delete'}
          onPress={() => setChoice({ kind: 'delete' })}
        />
      </View>
      <AppText size="footnote" color="textSecondary">
        {choice?.kind === 'delete'
          ? 'Its pets, feeds and photos go for everyone in it.'
          : 'The new Owner keeps its pets and history. The household becomes private until they list it again.'}
      </AppText>
      <MainButton
        text="Continue"
        isLoading={isSaving}
        isDisabled={!choice || isSaving}
        onPress={() => choice && onContinue(choice, () => goTo(nextStepId))}
      />
    </View>
  );
};

const REAUTH_HINT: Record<SignInMethod, string | null> = {
  email: null,
  apple: 'Apple asks you to confirm it is you.',
  google: 'Google asks you to confirm it is you.'
};

export const ConfirmStep = ({
  method,
  isDeleting,
  onDelete
}: {
  method: SignInMethod;
  isDeleting: boolean;
  onDelete: (values: DeleteAccountInput, onWrongPassword: () => void) => void;
}) => {
  const styles = useStyles(makeStyles);
  const form = useForm<DeleteAccountInput>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { confirmation: '', password: '' },
    mode: 'onChange'
  });
  const { control, handleSubmit, setError } = form;
  const [confirmation, password] = useWatch({ control, name: ['confirmation', 'password'] });

  const isEmail = method === 'email';
  const isReady =
    confirmation.trim() === DELETE_ACCOUNT_PHRASE && (!isEmail || password.length > 0);

  const submit = handleSubmit((values) =>
    onDelete(values, () => setError('password', { message: 'That password is not right' }))
  );

  return (
    <FormProvider {...form}>
      <View style={styles.body}>
        <AppText size="headline" fontWeight="bold" color="error">
          This happens now and cannot be undone.
        </AppText>
        <View style={styles.summary}>
          <AppText size="subhead">
            <AppText size="subhead" fontWeight="bold">
              Deleted:{' '}
            </AppText>
            your account, your photo, and your posts, comments and likes.
          </AppText>
          <AppText size="subhead">
            <AppText size="subhead" fontWeight="bold">
              Kept, with no name:{' '}
            </AppText>
            feeds and reminders you logged, so your household keeps its record.
          </AppText>
        </View>
        {isEmail && (
          <FormTextInput
            control={control}
            name="password"
            label="Your password"
            isLabelIndicated
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            returnKeyType="next"
          />
        )}
        <FormTextInput
          control={control}
          name="confirmation"
          label={`Type ${DELETE_ACCOUNT_PHRASE}`}
          isLabelIndicated
          placeholder={DELETE_ACCOUNT_PHRASE}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
        <MainButton
          text="Delete account"
          variant="destructive"
          isLoading={isDeleting}
          isDisabled={!isReady || isDeleting}
          onPress={() => void submit()}
        />
        {REAUTH_HINT[method] && (
          <AppText size="footnote" color="textSecondary" style={styles.hint}>
            {REAUTH_HINT[method]}
          </AppText>
        )}
      </View>
    </FormProvider>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    body: {
      gap: spacing.three
    },
    rows: {
      gap: spacing.two
    },
    loading: {
      paddingVertical: spacing.four
    },
    hint: {
      textAlign: 'center'
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      padding: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundSheetRow
    },
    cardText: {
      flex: 1,
      gap: spacing.half
    },
    summary: {
      gap: spacing.two,
      padding: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundSheetRow
    }
  });
