import InfoSheet from '@/components/bottom-sheets/info-sheet';
import AppText from '@/components/core/app-text';
import DropdownPickerValidated from '@/components/core/dropdown-picker-validated';
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import InviteCodeCard from '@/components/screens/household/invite-code-card';
import { ROLE_OPTIONS } from '@/constants/options';
import { ROLE_INFO } from '@/constants/role-info';
import { inviteSchema, type InviteInput } from '@/constants/schemas/invite';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/use-household';
import { useCreateInvite } from '@/hooks/queries/use-invites';
import { useStyles } from '@/hooks/use-styles';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

/**
 * A screen rather than a sheet, for two reasons. It carries a form, a role
 * picker and a help affordance, which is a screen's worth of content. And the
 * help is an InfoSheet — presenting that from inside another sheet stacks a
 * sheet on a sheet, the iOS rough edge AGENTS.md warns about.
 */
const InviteMember = () => {
  const styles = useStyles(makeStyles);
  const infoSheetRef = useRef<TrueSheet | null>(null);
  const [code, setCode] = useState<string | undefined>(undefined);

  const { data: household } = useHousehold();
  const { mutate: createInvite, isPending: isSending } = useCreateInvite(household?.id);

  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'contributor' }
  });
  const { control, handleSubmit } = form;

  const email = useWatch({ control, name: 'email' });
  const role = useWatch({ control, name: 'role' });

  const onSubmit = handleSubmit((values) => {
    createInvite(values, {
      onSuccess: (result) => {
        if (result.status === 'created') setCode(result.code);
      }
    });
  });

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <FormProvider {...form}>
          <View style={styles.form}>
            <AppText size={15} color="textSecondary">
              They&apos;ll get a notification in Crumpet. If they haven&apos;t joined yet, the
              invite will be waiting when they sign up with this address.
            </AppText>

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange } }) => (
                <TextInputValidated
                  name="email"
                  label="Email address"
                  placeholder="lisa@example.com"
                  value={email ?? ''}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
              )}
            />

            <Controller
              control={control}
              name="role"
              render={({ field: { onChange } }) => (
                <DropdownPickerValidated
                  name="role"
                  label="Role"
                  options={ROLE_OPTIONS}
                  value={role ?? 'contributor'}
                  onChange={onChange}
                />
              )}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="What do these roles mean?"
              onPress={() => void infoSheetRef.current?.present()}>
              <AppText size={14} color="primary">
                What do these roles mean?
              </AppText>
            </Pressable>

            <MainButton
              text={isSending ? 'Sending…' : 'Send invite'}
              isLoading={isSending}
              isDisabled={isSending}
              onPress={() => void onSubmit()}
            />
          </View>
        </FormProvider>

        {code && <InviteCodeCard code={code} householdName={household?.name ?? 'our household'} />}
      </ScreenScrollView>

      <InfoSheet
        sheetRef={infoSheetRef}
        glyph="users"
        title="Roles"
        subtitle="What each person can do in your household"
        body={ROLE_INFO}
      />
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingVertical: spacing.four,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.four
    },
    form: { gap: spacing.three }
  });

export default InviteMember;
