import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import FormTextInput from '@/components/core/form-text-input';
import MainButton from '@/components/core/main-button';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import AuthDivider from '@/components/screens/auth/auth-divider';
import AuthFooterLink from '@/components/screens/auth/auth-footer-link';
import SocialAuthButtons from '@/components/screens/auth/social-auth-buttons';
import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { signInSchema, type SignInFormValues } from '@/constants/schemas/sign-in';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { logError, userFacingMessage } from '@/lib/errors';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import AuthService from '@/services/auth.service';

const SignIn = () => {
  const styles = useStyles(makeStyles);

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched'
  });

  const {
    handleSubmit,
    formState: { isSubmitting, isValid }
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await AuthService.signInWithPassword(values);
      showSuccessToast(SuccessMessage.SignedIn);
    } catch (error) {
      logError(error);
      showErrorToast(
        ErrorMessage.SignInFailed,
        userFacingMessage(error, 'Check your details and try again')
      );
    }
  });

  return (
    <ScreenView edges={['bottom']}>
      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <TextDescriptionHeader
          title="Sign in to Crumpet"
          description="Pick up where your household left off."
        />

        <SocialAuthButtons />

        <AuthDivider label="or" />

        <FormProvider {...form}>
          <View style={styles.form}>
            <FormTextInput
              name="email"
              label="Email"
              isLabelIndicated
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              testID="sign-in-email"
            />
            <FormTextInput
              name="password"
              label="Password"
              isLabelIndicated
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={() => {
                void onSubmit();
              }}
              testID="sign-in-password"
            />
          </View>

          <View style={styles.actions}>
            <MainButton
              text={isSubmitting ? 'Logging in…' : 'Log in'}
              isLoading={isSubmitting}
              isDisabled={isSubmitting || !isValid}
              onPress={() => {
                void onSubmit();
              }}
            />

            <AuthFooterLink linkText="Reset password" href="/forgot-password" />
            <AuthFooterLink linkText="Create new account" href="/" isDismissTo />
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
      marginTop: spacing.two
    }
  });

export default SignIn;
