import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import AuthFooterLink from '@/components/screens/auth/auth-footer-link';
import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues
} from '@/constants/schemas/forgot-password';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { userFacingMessage } from '@/lib/errors';
import { hapticLight } from '@/lib/haptics';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import AuthService from '@/services/auth.service';

const ForgotPassword = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onTouched'
  });

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isValid }
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    hapticLight();

    try {
      await AuthService.resetPasswordForEmail(values);
      showSuccessToast(SuccessMessage.ResetCodeSent);
      router.push({ pathname: '/forgot-password/verify', params: { email: values.email } });
    } catch (error) {
      console.error(error);
      showErrorToast(ErrorMessage.ResetCodeSendFailed, userFacingMessage(error, 'Try again'));
    }
  });

  return (
    <ScreenView edges={['bottom']}>
      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <TextDescriptionHeader
          title="Reset your password"
          description="Give us the email on your account and we will send you a code."
        />

        <FormProvider {...form}>
          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="email"
                  label="Email"
                  isLabelIndicated
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    void onSubmit();
                  }}
                  testID="forgot-password-email"
                />
              )}
            />
          </View>

          <View style={styles.actions}>
            <MainButton
              text={isSubmitting ? 'Sending code…' : 'Send code'}
              isLoading={isSubmitting}
              isDisabled={isSubmitting || !isValid}
              onPress={() => {
                void onSubmit();
              }}
            />

            <AuthFooterLink
              prompt="Remembered it?"
              linkText="Sign in here"
              href="/sign-in"
              isReplace
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
      marginTop: spacing.two
    }
  });

export default ForgotPassword;
