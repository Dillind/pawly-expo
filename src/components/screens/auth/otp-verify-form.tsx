import MainButton from '@/components/core/main-button';
import VerificationCodeInput from '@/components/core/verification-code-input';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import TextDescriptionHeader from '@/components/layout/text-description-header';
import ResendCodeRow from '@/components/screens/auth/resend-code-row';
import { ErrorMessage } from '@/constants/enums';
import { verifyOtpSchema, type VerifyOtpFormValues } from '@/constants/schemas/verify-otp';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { userFacingMessage } from '@/lib/errors';
import { hapticLight } from '@/lib/haptics';
import { showErrorToast } from '@/lib/toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

type Props = {
  title: string;
  description: string;
  onVerify: (token: string) => Promise<void>;
  onResend: () => Promise<void>;
  testID: string;
};

const OtpVerifyForm = ({ title, description, onVerify, onResend, testID }: Props) => {
  const styles = useStyles(makeStyles);

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
      await onVerify(values.token);
    } catch (error) {
      console.error(error);
      showErrorToast(
        ErrorMessage.VerificationFailed,
        userFacingMessage(error, 'Check the code and try again')
      );
    }
  });

  return (
    <ScreenView edges={['bottom']}>
      <ScreenScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <TextDescriptionHeader title={title} description={description} />

        <FormProvider {...form}>
          <View style={styles.form}>
            <Controller
              control={control}
              name="token"
              render={({ field: { onChange, value } }) => (
                <VerificationCodeInput
                  name="token"
                  label="Verification code"
                  value={value}
                  onChangeText={onChange}
                  onComplete={() => {
                    void onSubmit();
                  }}
                  testID={testID}
                />
              )}
            />

            <ResendCodeRow onResend={onResend} />
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
      gap: spacing.three
    },
    actions: {
      gap: spacing.two,
      marginTop: spacing.two
    }
  });

export default OtpVerifyForm;
