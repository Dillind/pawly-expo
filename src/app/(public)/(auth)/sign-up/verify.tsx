import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import { ErrorMessage } from '@/constants/enums';
import { userFacingMessage } from '@/lib/errors';
import { verifyOtpSchema, type VerifyOtpFormValues } from '@/constants/schemas/verify-otp';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import { showErrorToast } from '@/lib/toast';
import AuthService from '@/services/auth.service';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams } from 'expo-router';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';

const VerifySignUp = () => {
  const styles = useStyles(makeStyles);
  const { email } = useLocalSearchParams<{ email: string }>();

  const form = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { token: '' },
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
      // No manual navigation on success: verifying flips the Supabase session,
      // which the root layout's AuthGate reacts to and swaps to (protected) itself.
      await AuthService.verifySignUpOtp({ email, token: values.token });
    } catch (error) {
      showErrorToast(
        ErrorMessage.VerificationFailed,
        userFacingMessage(error, 'Check the code and try again')
      );
    }
  });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <TextDescriptionHeader
          title="Check your email"
          description={`Enter the 8-digit code we sent to ${email}.`}
        />

        <FormProvider {...form}>
          <View style={styles.form}>
            <Controller
              control={control}
              name="token"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name="token"
                  label="Verification code"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="12345678"
                  keyboardType="number-pad"
                  maxLength={8}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    void onSubmit();
                  }}
                  testID="verify-signup-token"
                />
              )}
            />
          </View>

          <View style={styles.actions}>
            <MainButton
              text={isSubmitting ? 'Verifying…' : 'Verify'}
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

export default VerifySignUp;
