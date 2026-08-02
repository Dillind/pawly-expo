import { ErrorMessage } from '@/constants/enums';
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import { signUpSchema, type SignUpFormValues } from '@/constants/schemas/sign-up';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import AuthService from '@/services/auth.service';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';
import { showErrorToast } from '@/lib/toast';

const SignUp = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
    mode: 'onBlur'
  });

  const {
    control,
    handleSubmit,
    formState: { isSubmitting }
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    hapticLight();

    try {
      await AuthService.signUp(values);
      router.push({ pathname: '/sign-up/verify', params: { email: values.email } });
    } catch (error) {
      showErrorToast(ErrorMessage.SignUpFailed, error instanceof Error ? error.message : 'Check your details and try again');
    }
  });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <TextDescriptionHeader
          title="Create your account"
          description="Set up your account so you can coordinate care for your pet."
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
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Sarah"
                  autoComplete="given-name"
                  returnKeyType="next"
                  testID="sign-up-first-name"
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
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Smith"
                  autoComplete="family-name"
                  returnKeyType="next"
                  testID="sign-up-last-name"
                />
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="email"
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  testID="sign-up-email"
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="password"
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="At least 8 characters"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    void onSubmit();
                  }}
                  testID="sign-up-password"
                />
              )}
            />
          </View>

          <View style={styles.actions}>
            <MainButton
              text={isSubmitting ? 'Creating account…' : 'Create account'}
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
              onPress={() => {
                void onSubmit();
              }}
            />
          </View>
        </FormProvider>
      </ScrollView>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      padding: spacing.four,
      gap: spacing.three
    },
    form: {
      gap: spacing.two
    },
    actions: {
      gap: spacing.two,
      marginTop: spacing.two
    }
  });

export default SignUp;
