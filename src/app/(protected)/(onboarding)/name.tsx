import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import { nameSchema, type NameFormValues } from '@/constants/schemas/name';
import type { AppTheme } from '@/constants/theme';
import { useUpdateName } from '@/hooks/queries/account/use-update-name';
import { useStyles } from '@/hooks/use-styles';
import { useAuthStore } from '@/stores/auth-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

const NameStep = () => {
  const styles = useStyles(makeStyles);
  const { profile } = useAuthStore();
  const { mutate: saveName, isPending: isSaving } = useUpdateName();

  const form = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    // `values`, not `defaultValues`: the profile is undefined until its query
    // resolves, and defaults are read once, so a cold start would show blanks.
    values: { firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '' },
    mode: 'onTouched'
  });

  const {
    control,
    handleSubmit,
    formState: { isValid }
  } = form;

  const onSubmit = handleSubmit((values) => saveName(values));

  return (
    <ScreenView>
      <ScreenScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <TextDescriptionHeader
          title="What should we call you?"
          description="Your household sees this name on every feed you log."
        />

        <FormProvider {...form}>
          <View style={styles.form}>
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="firstName"
                  label="First name"
                  isLabelIndicated
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Sarah"
                  autoComplete="given-name"
                  returnKeyType="next"
                  testID="onboarding-first-name"
                />
              )}
            />
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="lastName"
                  label="Last name"
                  isLabelIndicated
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Smith"
                  autoComplete="family-name"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    void onSubmit();
                  }}
                  testID="onboarding-last-name"
                />
              )}
            />
          </View>

          <View style={styles.actions}>
            <MainButton
              text={isSaving ? 'Saving…' : 'Continue'}
              isLoading={isSaving}
              isDisabled={isSaving || !isValid}
              onPress={() => {
                void onSubmit();
              }}
            />
          </View>
        </FormProvider>
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingVertical: spacing.four,
      gap: spacing.three
    },
    form: {
      gap: spacing.two
    },
    actions: {
      gap: spacing.two,
      marginTop: 'auto'
    }
  });

export default NameStep;
